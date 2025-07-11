<template>
  <div class="w-full flex flex-col">
    <div class="w-full flex flex-row justify-between items-center mb-1">
      <span class="textlabel mr-4">{{ $t("issue.data-export.options") }}</span>
      <div
        v-if="showEditButtons"
        class="flex flex-row justify-end items-center gap-2"
      >
        <NTooltip
          v-if="!state.isEditing"
          :disabled="denyEditTaskReasons.length === 0"
        >
          <template #trigger>
            <NButton
              size="tiny"
              tag="div"
              :disabled="denyEditTaskReasons.length > 0"
              @click="state.isEditing = true"
            >
              {{ $t("common.edit") }}
            </NButton>
          </template>
          <template #default>
            <ErrorList :errors="denyEditTaskReasons" />
          </template>
        </NTooltip>
        <template v-else>
          <NButton size="tiny" @click="handleSaveEdit">
            {{ $t("common.save") }}
          </NButton>
          <NButton size="tiny" quaternary @click.prevent="handleCancelEdit">
            {{ $t("common.cancel") }}
          </NButton>
        </template>
      </div>
    </div>
    <div class="w-full h-8 flex flex-row justify-start items-center">
      <span class="textinfolabel inline-block mr-2 !min-w-[64px]">{{
        $t("issue.data-export.format")
      }}</span>
      <ExportFormatSelector
        :key="refreshKey"
        v-model:format="convertedFormat"
        :editable="optionsEditable"
      />
    </div>
    <div class="w-full h-8 flex flex-row justify-start items-center">
      <span class="textinfolabel inline-block mr-2 !min-w-[64px]">{{
        $t("issue.data-export.encrypt")
      }}</span>
      <ExportPasswordInputer
        :key="refreshKey"
        v-model:password="state.config.password"
        :editable="optionsEditable"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { cloneDeep, head } from "lodash-es";
import { NButton, NTooltip } from "naive-ui";
import { computed, watch, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  allowUserToEditStatementForTask,
  useIssueContext,
} from "@/components/IssueV1/logic";
import ErrorList from "@/components/misc/ErrorList.vue";
import { create } from "@bufbuild/protobuf";
import { planServiceClientConnect } from "@/grpcweb";
import { UpdatePlanRequestSchema } from "@/types/proto-es/v1/plan_service_pb";
import { convertOldPlanToNew, convertNewPlanToOld } from "@/utils/v1/plan-conversions";
import { convertExportFormatToNew, convertExportFormatToOld } from "@/utils/v1/common-conversions";
import { pushNotification } from "@/store";
import { IssueStatus } from "@/types/proto/v1/issue_service";
import {
  Plan_Spec,
  Plan_ExportDataConfig,
} from "@/types/proto/v1/plan_service";
import ExportFormatSelector from "./ExportFormatSelector.vue";
import ExportPasswordInputer from "./ExportPasswordInputer.vue";

interface LocalState {
  config: Plan_ExportDataConfig;
  isEditing: boolean;
}

const { t } = useI18n();
const context = useIssueContext();
const { issue, isCreating, selectedTask, events } = context;
const refreshKey = ref(0);

const spec = computed(
  () => head(issue.value.planEntity?.specs) || Plan_Spec.fromPartial({})
);

const state = reactive<LocalState>({
  config: Plan_ExportDataConfig.fromPartial({ ...spec.value.exportDataConfig }),
  isEditing: false,
});

const showEditButtons = computed(() => {
  return !isCreating.value && issue.value.status === IssueStatus.OPEN;
});

const optionsEditable = computed(() => {
  return isCreating.value || (showEditButtons.value && state.isEditing);
});

const denyEditTaskReasons = computed(() =>
  allowUserToEditStatementForTask(issue.value, selectedTask.value)
);

// Convert between old and new ExportFormat types
const convertedFormat = computed({
  get() {
    return convertExportFormatToNew(state.config.format);
  },
  set(value) {
    state.config.format = convertExportFormatToOld(value);
  }
});

const handleCancelEdit = () => {
  state.isEditing = false;
  state.config = Plan_ExportDataConfig.fromPartial({
    ...spec.value.exportDataConfig,
  });
  // Trigger a re-render of the child components.
  refreshKey.value++;
};

const handleSaveEdit = async () => {
  const planPatch = cloneDeep(issue.value.planEntity);
  if (!planPatch) {
    // Should not reach here.
    throw new Error("Plan is not defined. Cannot update export options.");
  }

  const distinctSpecIds = new Set([spec.value.id]);
  const specsToPatch = (planPatch.specs || []).filter((spec) =>
    distinctSpecIds.has(spec.id)
  );
  for (let i = 0; i < specsToPatch.length; i++) {
    const spec = specsToPatch[i];
    const config = spec.exportDataConfig;
    if (!config) continue;
    config.format = state.config.format;
    config.password = state.config.password || undefined;
  }

  const newPlan = convertOldPlanToNew(planPatch);
  const request = create(UpdatePlanRequestSchema, {
    plan: newPlan,
    updateMask: { paths: ["specs"] },
  });
  const response = await planServiceClientConnect.updatePlan(request);
  const updatedPlan = convertNewPlanToOld(response);
  issue.value.planEntity = updatedPlan;

  events.emit("status-changed", { eager: true });
  pushNotification({
    module: "bytebase",
    style: "SUCCESS",
    title: t("common.updated"),
  });
  handleCancelEdit();
};

watch(
  () => state.config,
  () => {
    if (!isCreating.value) {
      return;
    }
    for (const spec of issue.value.planEntity?.specs ?? []) {
      spec.exportDataConfig = Plan_ExportDataConfig.fromPartial({
        ...spec.exportDataConfig,
        format: state.config.format,
        password: state.config.password,
      });
    }
  },
  { deep: true }
);
</script>
