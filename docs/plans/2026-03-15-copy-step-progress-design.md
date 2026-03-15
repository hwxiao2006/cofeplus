# Copy Step Progress Design

## Context

The copy-product detail page currently uses the top progress indicator as clickable tabs while also exposing bottom `上一步 / 下一步 / 确认复制` actions. This creates two navigation models for the same linear workflow and makes the interaction feel redundant.

## Decision

Keep the top element as a read-only progress indicator and keep the bottom action bar as the only step-navigation control.

## Interaction Rules

- The top `2 基本信息 / 3 配方配置 / 4 确认复制` bar only indicates current progress.
- Users move through the workflow only with the bottom action buttons.
- On the confirmation step, keep explicit `编辑基本信息` and `编辑配方配置` buttons so users can jump back intentionally.

## Result

- No conflict between "tab switching" and "step navigation".
- The page reads as a linear wizard instead of mixed tab-plus-wizard behavior.
- The confirmation page still supports precise backtracking without making the step bar interactive.
