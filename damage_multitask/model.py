from __future__ import annotations

import copy
import math
import time
from typing import Any

import torch
from torch import nn

from ultralytics.models.yolo.detect.train import DetectionTrainer
from ultralytics.nn.modules.head import Detect
from ultralytics.nn.tasks import DetectionModel
from ultralytics.utils import LOGGER
from ultralytics.utils.loss import BboxLoss, TaskAlignedAssigner, make_anchors, v8DetectionLoss


TYPE_NAMES = ("tear", "deformation", "wet")
SEVERITY_NAMES = ("l1", "l2", "l3")
JOINT_NAMES = tuple(f"{kind}_{level}" for kind in TYPE_NAMES for level in SEVERITY_NAMES)


def _replace_output_convs(branches: nn.ModuleList, out_channels: int) -> None:
    """Replace each YOLO classification tower's last convolution."""
    for branch in branches:
        old = branch[-1]
        if not isinstance(old, nn.Conv2d):
            raise TypeError(f"Expected Conv2d at the end of a classification tower, got {type(old)!r}")
        new = nn.Conv2d(
            old.in_channels,
            out_channels,
            kernel_size=old.kernel_size,
            stride=old.stride,
            padding=old.padding,
            dilation=old.dilation,
            groups=old.groups,
            bias=True,
        ).to(device=old.weight.device, dtype=old.weight.dtype)
        nn.init.normal_(new.weight, mean=0.0, std=0.01)
        nn.init.zeros_(new.bias)
        branch[-1] = new


class HierarchicalDetect(Detect):
    """YOLO head with separate type and type-conditional ordinal-severity towers.

    Raw score channels are:
      0..2: tear/deformation/wet logits
      3..8: two ordinal logits per type (at least L2, at least L3)

    Inference converts these into the original nine joint class probabilities, so
    ordinary Ultralytics NMS and validators can still be used.
    """

    type_nc = 3
    ordinal_per_type = 2
    joint_nc = 9

    @classmethod
    def convert(cls, head: Detect) -> "HierarchicalDetect":
        if isinstance(head, cls):
            return head
        if head.end2end:
            raise ValueError("The hierarchical head currently supports standard YOLO detection heads only.")

        # Preserve the pretrained classification tower features, then give the two
        # tasks independent final towers and output convolutions.
        head.__class__ = cls
        head.cv3_type = copy.deepcopy(head.cv3)
        head.cv3_severity = copy.deepcopy(head.cv3)
        _replace_output_convs(head.cv3_type, cls.type_nc)
        _replace_output_convs(head.cv3_severity, cls.type_nc * cls.ordinal_per_type)
        del head.cv3
        head.nc = cls.joint_nc
        head.no = head.reg_max * 4 + cls.type_nc + cls.type_nc * cls.ordinal_per_type
        head._end2end = False
        head.bias_init()
        return head

    @property
    def one2many(self) -> dict[str, nn.Module]:
        return {
            "box_head": self.cv2,
            "type_head": self.cv3_type,
            "severity_head": self.cv3_severity,
        }

    @property
    def end2end(self) -> bool:
        return False

    @end2end.setter
    def end2end(self, value: bool) -> None:
        self._end2end = False

    def forward_head(
        self,
        x: list[torch.Tensor],
        box_head: nn.Module | None = None,
        type_head: nn.Module | None = None,
        severity_head: nn.Module | None = None,
    ) -> dict[str, torch.Tensor]:
        if box_head is None or type_head is None or severity_head is None:
            return {}
        batch_size = x[0].shape[0]
        boxes = torch.cat(
            [box_head[i](x[i]).view(batch_size, 4 * self.reg_max, -1) for i in range(self.nl)], dim=-1
        )
        type_logits = torch.cat(
            [type_head[i](x[i]).view(batch_size, self.type_nc, -1) for i in range(self.nl)], dim=-1
        )
        severity_logits = torch.cat(
            [
                severity_head[i](x[i]).view(batch_size, self.type_nc * self.ordinal_per_type, -1)
                for i in range(self.nl)
            ],
            dim=-1,
        )
        return {"boxes": boxes, "scores": torch.cat((type_logits, severity_logits), dim=1), "feats": x}

    def forward(self, x: list[torch.Tensor]):
        preds = self.forward_head(x, **self.one2many)
        if self.training:
            return preds
        decoded = self._inference(preds)
        return decoded if self.export else (decoded, preds)

    def _joint_probabilities(self, raw_scores: torch.Tensor) -> torch.Tensor:
        type_probability = raw_scores[:, : self.type_nc].sigmoid()  # B, 3, A
        ordinal = raw_scores[:, self.type_nc :].sigmoid().view(
            raw_scores.shape[0], self.type_nc, self.ordinal_per_type, raw_scores.shape[-1]
        )
        at_least_l2 = ordinal[:, :, 0]
        # Enforce P(L3) <= P(at least L2) at inference time.
        at_least_l3 = torch.minimum(at_least_l2, ordinal[:, :, 1])
        severity_probability = torch.stack(
            (1.0 - at_least_l2, at_least_l2 - at_least_l3, at_least_l3), dim=2
        )  # B, 3 types, 3 levels, A
        return (type_probability.unsqueeze(2) * severity_probability).flatten(1, 2)

    def _inference(self, preds: dict[str, torch.Tensor]) -> torch.Tensor:
        boxes = self._get_decode_boxes(preds)
        scores = preds["scores"]
        if hasattr(self, "area_mlp"):
            image_hw = torch.tensor(
                preds["feats"][0].shape[2:], device=boxes.device, dtype=boxes.dtype
            ) * self.stride[0]
            adjusted = scores.clone()
            adjusted[:, self.type_nc :] += self.area_delta_from_xywh(boxes.detach(), image_hw)
            scores = adjusted
        return torch.cat((boxes, self._joint_probabilities(scores)), dim=1)

    def enable_area_awareness(self) -> None:
        """Add a zero-initialized geometry branch without changing initial predictions."""
        if hasattr(self, "area_mlp"):
            return
        reference = next(self.parameters())
        self.area_mlp = nn.Sequential(
            nn.Linear(6, 32),
            nn.SiLU(),
            nn.Linear(32, self.type_nc * self.ordinal_per_type),
        ).to(device=reference.device, dtype=reference.dtype)
        nn.init.zeros_(self.area_mlp[-1].weight)
        nn.init.zeros_(self.area_mlp[-1].bias)

    def _area_features(
        self, cx: torch.Tensor, cy: torch.Tensor, width: torch.Tensor, height: torch.Tensor, image_hw: torch.Tensor
    ) -> torch.Tensor:
        image_h, image_w = image_hw[0], image_hw[1]
        width_ratio = (width / image_w).clamp(1e-6, 2.0)
        height_ratio = (height / image_h).clamp(1e-6, 2.0)
        area_ratio = (width_ratio * height_ratio).clamp(1e-8, 4.0)
        aspect = (width_ratio / height_ratio).clamp(1e-3, 1e3)
        return torch.stack(
            (
                area_ratio.log().clamp(-12.0, 2.0),
                width_ratio.log().clamp(-12.0, 1.0),
                height_ratio.log().clamp(-12.0, 1.0),
                aspect.log().clamp(-7.0, 7.0),
                (cx / image_w).clamp(-0.5, 1.5),
                (cy / image_h).clamp(-0.5, 1.5),
            ),
            dim=-1,
        )

    def area_delta_from_xywh(self, boxes: torch.Tensor, image_hw: torch.Tensor) -> torch.Tensor:
        """Return Bx6xA ordinal-logit corrections from inference xywh boxes."""
        features = self._area_features(boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3], image_hw)
        return self.area_mlp(features).permute(0, 2, 1).contiguous()

    def area_delta_from_xyxy(self, boxes: torch.Tensor, image_hw: torch.Tensor) -> torch.Tensor:
        """Return BxAx6 corrections from training xyxy boxes."""
        width = (boxes[..., 2] - boxes[..., 0]).clamp_min(1e-4)
        height = (boxes[..., 3] - boxes[..., 1]).clamp_min(1e-4)
        cx = (boxes[..., 0] + boxes[..., 2]) * 0.5
        cy = (boxes[..., 1] + boxes[..., 3]) * 0.5
        return self.area_mlp(self._area_features(cx, cy, width, height, image_hw))

    def bias_init(self) -> None:
        for index, box_head in enumerate(self.cv2):
            box_head[-1].bias.data[:] = 2.0
            prior = math.log(5 / self.type_nc / (640 / self.stride[index]) ** 2)
            self.cv3_type[index][-1].bias.data[:] = prior
            # Neutral ordinal prior; the supervised positive anchors calibrate it.
            self.cv3_severity[index][-1].bias.data.zero_()


class HierarchicalDetectionLoss(v8DetectionLoss):
    """Task-aligned box loss + type BCE + type-conditional ordinal severity BCE."""

    def __init__(self, model: nn.Module, tal_topk: int = 10):
        super().__init__(model, tal_topk=tal_topk)
        self.type_nc = 3
        self.joint_nc = 9
        self.loss_names = ("box_loss", "type_loss", "severity_loss", "dfl_loss")
        self.assigner = TaskAlignedAssigner(
            topk=tal_topk,
            num_classes=self.type_nc,
            alpha=0.5,
            beta=6.0,
            stride=self.stride.tolist(),
        )
        self.bbox_loss = BboxLoss(self.reg_max).to(self.device)
        # Moderate positive weighting protects the scarce L2/L3 examples without
        # allowing the 15 wet-L3 instances to dominate calibration.
        self.ordinal_positive_weights = torch.tensor(
            [[1.5, 3.0], [1.0, 2.0], [1.5, 3.0]], device=self.device
        )
        self.severity_gain = 1.5
        self.monotonic_gain = 0.1

    def get_assigned_targets_and_loss(self, preds: dict[str, torch.Tensor], batch: dict[str, Any]) -> tuple:
        loss = torch.zeros(4, device=self.device)  # box, type, severity, dfl
        pred_distri = preds["boxes"].permute(0, 2, 1).contiguous()
        raw_scores = preds["scores"].permute(0, 2, 1).contiguous()
        pred_type = raw_scores[..., : self.type_nc]
        pred_ordinal = raw_scores[..., self.type_nc :].view(
            raw_scores.shape[0], raw_scores.shape[1], self.type_nc, 2
        )
        anchor_points, stride_tensor = make_anchors(preds["feats"], self.stride, 0.5)

        dtype = pred_type.dtype
        batch_size = pred_type.shape[0]
        imgsz = torch.tensor(preds["feats"][0].shape[2:], device=self.device, dtype=dtype) * self.stride[0]

        joint_targets = torch.cat(
            (batch["batch_idx"].view(-1, 1), batch["cls"].view(-1, 1), batch["bboxes"]), dim=1
        )
        joint_targets = self.preprocess(
            joint_targets.to(self.device), batch_size, scale_tensor=imgsz[[1, 0, 1, 0]]
        )
        gt_joint, gt_bboxes = joint_targets.split((1, 4), dim=2)
        gt_type = torch.div(gt_joint, 3, rounding_mode="floor")
        mask_gt = gt_bboxes.sum(2, keepdim=True).gt_(0.0)

        pred_bboxes = self.bbox_decode(anchor_points, pred_distri)
        _, target_bboxes, target_scores, fg_mask, target_gt_idx = self.assigner(
            pred_type.detach().sigmoid(),
            (pred_bboxes.detach() * stride_tensor).type(gt_bboxes.dtype),
            anchor_points * stride_tensor,
            gt_type,
            gt_bboxes,
            mask_gt,
        )
        target_scores_sum = torch.clamp(target_scores.sum(), min=1.0)

        loss[1] = self.bce(pred_type, target_scores.to(dtype)).sum() / target_scores_sum

        if fg_mask.any():
            loss[0], loss[3] = self.bbox_loss(
                pred_distri,
                pred_bboxes,
                anchor_points,
                target_bboxes / stride_tensor,
                target_scores,
                target_scores_sum,
                fg_mask,
                imgsz,
                stride_tensor,
            )

            assigned_joint = gt_joint.squeeze(-1).long().gather(1, target_gt_idx)
            assigned_type = torch.div(assigned_joint, 3, rounding_mode="floor").clamp(0, 2)
            assigned_severity = torch.remainder(assigned_joint, 3)
            selected_ordinal = pred_ordinal.gather(
                2, assigned_type[..., None, None].expand(-1, -1, 1, 2)
            ).squeeze(2)
            ordinal_target = torch.stack(
                ((assigned_severity >= 1).to(dtype), (assigned_severity >= 2).to(dtype)), dim=-1
            )
            selected_pos_weights = self.ordinal_positive_weights[assigned_type]
            severity_bce = self.bce(selected_ordinal, ordinal_target)
            severity_bce = severity_bce * torch.where(
                ordinal_target > 0, selected_pos_weights, torch.ones_like(selected_pos_weights)
            )
            quality = target_scores.sum(-1)
            normalizer = torch.clamp(quality[fg_mask].sum(), min=1.0)
            severity_loss = (severity_bce.sum(-1) * quality * fg_mask).sum() / normalizer
            probability = selected_ordinal.sigmoid()
            monotonic_penalty = (
                torch.relu(probability[..., 1] - probability[..., 0]) * quality * fg_mask
            ).sum() / normalizer
            loss[2] = severity_loss + self.monotonic_gain * monotonic_penalty

        loss[0] *= self.hyp.box
        loss[1] *= self.hyp.cls
        loss[2] *= self.severity_gain
        loss[3] *= self.hyp.dfl
        detached = dict(zip(self.loss_names, loss.detach()))
        return (fg_mask, target_gt_idx, target_bboxes, anchor_points, stride_tensor), loss, detached


class HierarchicalDetectionModel(DetectionModel):
    """DetectionModel that installs the hierarchical head and criterion."""

    def make_hierarchical(self) -> None:
        self.model[-1] = HierarchicalDetect.convert(self.model[-1])
        self.nc = 9
        self.names = dict(enumerate(JOINT_NAMES))
        self.criterion = None

    def init_criterion(self):
        return HierarchicalDetectionLoss(self)


class AreaAwareHierarchicalDetectionLoss(HierarchicalDetectionLoss):
    """Hierarchical loss whose ordinal logits explicitly receive box geometry."""

    def __init__(self, model: nn.Module, tal_topk: int = 10):
        super().__init__(model, tal_topk=tal_topk)
        self.area_head = model.model[-1]

    def get_assigned_targets_and_loss(self, preds: dict[str, torch.Tensor], batch: dict[str, Any]) -> tuple:
        # This intentionally mirrors the parent implementation so the geometry
        # correction participates in the same positive-anchor ordinal objective.
        loss = torch.zeros(4, device=self.device)
        pred_distri = preds["boxes"].permute(0, 2, 1).contiguous()
        raw_scores = preds["scores"].permute(0, 2, 1).contiguous()
        pred_type = raw_scores[..., : self.type_nc]
        anchor_points, stride_tensor = make_anchors(preds["feats"], self.stride, 0.5)
        dtype, batch_size = pred_type.dtype, pred_type.shape[0]
        imgsz = torch.tensor(preds["feats"][0].shape[2:], device=self.device, dtype=dtype) * self.stride[0]

        joint_targets = torch.cat(
            (batch["batch_idx"].view(-1, 1), batch["cls"].view(-1, 1), batch["bboxes"]), dim=1
        )
        joint_targets = self.preprocess(
            joint_targets.to(self.device), batch_size, scale_tensor=imgsz[[1, 0, 1, 0]]
        )
        gt_joint, gt_bboxes = joint_targets.split((1, 4), dim=2)
        gt_type = torch.div(gt_joint, 3, rounding_mode="floor")
        mask_gt = gt_bboxes.sum(2, keepdim=True).gt_(0.0)

        pred_bboxes = self.bbox_decode(anchor_points, pred_distri)
        pixel_boxes = pred_bboxes.detach() * stride_tensor
        area_delta = self.area_head.area_delta_from_xyxy(pixel_boxes, imgsz)
        pred_ordinal = (
            raw_scores[..., self.type_nc :] + area_delta
        ).view(raw_scores.shape[0], raw_scores.shape[1], self.type_nc, 2)

        _, target_bboxes, target_scores, fg_mask, target_gt_idx = self.assigner(
            pred_type.detach().sigmoid(),
            (pred_bboxes.detach() * stride_tensor).type(gt_bboxes.dtype),
            anchor_points * stride_tensor,
            gt_type,
            gt_bboxes,
            mask_gt,
        )
        target_scores_sum = torch.clamp(target_scores.sum(), min=1.0)
        loss[1] = self.bce(pred_type, target_scores.to(dtype)).sum() / target_scores_sum

        if fg_mask.any():
            loss[0], loss[3] = self.bbox_loss(
                pred_distri, pred_bboxes, anchor_points, target_bboxes / stride_tensor,
                target_scores, target_scores_sum, fg_mask, imgsz, stride_tensor,
            )
            assigned_joint = gt_joint.squeeze(-1).long().gather(1, target_gt_idx)
            assigned_type = torch.div(assigned_joint, 3, rounding_mode="floor").clamp(0, 2)
            assigned_severity = torch.remainder(assigned_joint, 3)
            selected_ordinal = pred_ordinal.gather(
                2, assigned_type[..., None, None].expand(-1, -1, 1, 2)
            ).squeeze(2)
            ordinal_target = torch.stack(
                ((assigned_severity >= 1).to(dtype), (assigned_severity >= 2).to(dtype)), dim=-1
            )
            selected_pos_weights = self.ordinal_positive_weights[assigned_type]
            severity_bce = self.bce(selected_ordinal, ordinal_target)
            severity_bce *= torch.where(
                ordinal_target > 0, selected_pos_weights, torch.ones_like(selected_pos_weights)
            )
            quality = target_scores.sum(-1)
            normalizer = torch.clamp(quality[fg_mask].sum(), min=1.0)
            severity_loss = (severity_bce.sum(-1) * quality * fg_mask).sum() / normalizer
            probability = selected_ordinal.sigmoid()
            monotonic_penalty = (
                torch.relu(probability[..., 1] - probability[..., 0]) * quality * fg_mask
            ).sum() / normalizer
            loss[2] = severity_loss + self.monotonic_gain * monotonic_penalty

        loss[0] *= self.hyp.box
        loss[1] *= self.hyp.cls
        loss[2] *= self.severity_gain
        loss[3] *= self.hyp.dfl
        detached = dict(zip(self.loss_names, loss.detach()))
        return (fg_mask, target_gt_idx, target_bboxes, anchor_points, stride_tensor), loss, detached


class AreaAwareHierarchicalDetectionModel(HierarchicalDetectionModel):
    def make_area_aware(self) -> None:
        self.make_hierarchical()
        self.model[-1].enable_area_awareness()
        self.criterion = None

    def init_criterion(self):
        return AreaAwareHierarchicalDetectionLoss(self)


class HierarchicalDetectionTrainer(DetectionTrainer):
    """Ultralytics trainer that creates a hierarchical model from YOLO weights."""

    def check_resume(self, overrides):
        super().check_resume(overrides)
        # Multiprocess DataLoader workers have exited intermittently on this Windows
        # host during validation. Main-process loading is slower only marginally for
        # this local SSD dataset and is substantially more reliable.
        self.args.workers = 0

    def get_model(self, cfg: str | dict | None = None, weights=None, verbose: bool = True):
        model = self.set_model_names_for_load(
            HierarchicalDetectionModel(
                cfg, nc=self.data["nc"], ch=self.data["channels"], verbose=verbose
            )
        )
        source_model = weights.get("model") if isinstance(weights, dict) else weights
        source_head = None
        if hasattr(source_model, "model"):
            source_head = source_model.model[-1]

        if isinstance(source_head, HierarchicalDetect):
            model.make_hierarchical()
            model.load(weights)
        else:
            if weights:
                model.load(weights)
            model.make_hierarchical()
        return model

    def save_model(self):
        """Retry transient in-memory checkpoint serialization failures."""
        for attempt in range(4):
            try:
                return super().save_model()
            except (OSError, RuntimeError, ValueError) as error:
                if attempt == 3:
                    raise
                delay = 0.5 * (2**attempt)
                LOGGER.warning(
                    f"Checkpoint serialization failed ({error}); retrying in {delay:.1f}s "
                    f"({attempt + 1}/3)."
                )
                time.sleep(delay)


class AreaAwareHierarchicalDetectionTrainer(HierarchicalDetectionTrainer):
    """Trainer that upgrades a hierarchical checkpoint with explicit geometry."""

    def get_model(self, cfg: str | dict | None = None, weights=None, verbose: bool = True):
        model = self.set_model_names_for_load(
            AreaAwareHierarchicalDetectionModel(
                cfg, nc=self.data["nc"], ch=self.data["channels"], verbose=verbose
            )
        )
        source_model = weights.get("model") if isinstance(weights, dict) else weights
        source_head = source_model.model[-1] if hasattr(source_model, "model") else None
        if isinstance(source_head, HierarchicalDetect):
            model.make_hierarchical()
            model.load(weights)
            model.model[-1].enable_area_awareness()
            model.criterion = None
        else:
            if weights:
                model.load(weights)
            model.make_area_aware()
        return model
