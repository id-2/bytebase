<template>
  <Drawer :show="show" @close="close">
    <DrawerContent
      :title="title"
      class="w-[100vw] md:max-w-[calc(100vw-8rem)] md:w-[40vw]"
    >
      <template #default>
        <div class="flex flex-col gap-y-4">
          <p class="font-medium text-control">
            {{ $t("task.online-migration.gho\st-parameters") }}
            <LearnMoreLink
              class="text-sm ml-1"
              url="https://github.com/github/gh-ost/blob/master/doc/command-line-flags.md"
            />
          </p>
          <FlagsForm v-model:flags="flags" :readonly="readonly" />
        </div>
      </template>
      <template #footer>
        <div class="flex flex-row justify-end gap-x-3">
          <NButton @click="close">{{ $t("common.cancel") }}</NButton>
          <NTooltip :disabled="errors.length === 0">
            <template #trigger>
              <NButton type="primary" :disabled="!isDirty" @click="trySave">
                {{ $t("common.save") }}
              </NButton>
            </template>
            <template #default>
              <ErrorList :errors="errors" />
            </template>
          </NTooltip>
        </div>
      </template>
    </DrawerContent>
  </Drawer>
</template>

<script setup lang="ts">
import { cloneDeep, isEqual } from "lodash-es";
import { NButton, NTooltip } from "naive-ui";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import LearnMoreLink from "@/components/LearnMoreLink.vue";
import ErrorList from "@/components/misc/ErrorList.vue";
import { Drawer, DrawerContent } from "@/components/v2";
import { create } from "@bufbuild/protobuf";
import { planServiceClientConnect } from "@/grpcweb";
import { UpdatePlanRequestSchema } from "@/types/proto-es/v1/plan_service_pb";
import { convertOldPlanToNew, convertNewPlanToOld } from "@/utils/v1/plan-conversions";
import { pushNotification } from "@/store";
import FlagsForm from "./FlagsForm";
import { useGhostSettingContext } from "./context";

defineProps<{
  show: boolean;
}>();

const emits = defineEmits<{
  (e: "update:show", value: boolean): void;
}>();

const { t } = useI18n();
const { isCreating, allowChange, plan, selectedSpec, events } =
  useGhostSettingContext();

const title = computed(() => {
  return t("task.online-migration.configure-ghost-parameters");
});
const config = computed(() => {
  return selectedSpec.value?.changeDatabaseConfig;
});
const flags = ref<Record<string, string>>({});

const isDirty = computed(() => {
  return !isEqual(config.value?.ghostFlags ?? {}, flags.value);
});
const errors = computed(() => {
  const errors: string[] = [];
  if (!isDirty.value) {
    errors.push(t("task.online-migration.error.nothing-changed"));
  }
  return errors;
});

const readonly = computed(() => {
  if (isCreating.value) return false;
  return !allowChange.value;
});

const close = () => {
  flags.value = cloneDeep(config.value?.ghostFlags ?? {});
  emits("update:show", false);
};

const trySave = async () => {
  if (errors.value.length > 0) {
    return;
  }

  if (isCreating.value) {
    if (!selectedSpec.value || !selectedSpec.value.changeDatabaseConfig) return;
    selectedSpec.value.changeDatabaseConfig.ghostFlags = cloneDeep(flags.value);
  } else {
    const planPatch = cloneDeep(plan.value);
    const spec = (planPatch?.specs || []).find((spec) => {
      return spec.id === selectedSpec.value?.id;
    });
    if (!planPatch || !spec || !spec.changeDatabaseConfig) {
      // Should not reach here.
      throw new Error(
        "Plan or spec is not defined. Cannot update gh-ost flags."
      );
    }

    spec.changeDatabaseConfig.ghostFlags = cloneDeep(flags.value);
    const newPlan = convertOldPlanToNew(planPatch);
    const request = create(UpdatePlanRequestSchema, {
      plan: newPlan,
      updateMask: { paths: ["specs"] },
    });
    const response = await planServiceClientConnect.updatePlan(request);
    const updated = convertNewPlanToOld(response);
    Object.assign(plan.value, updated);

    pushNotification({
      module: "bytebase",
      style: "SUCCESS",
      title: t("common.updated"),
    });
    events.emit("update");
  }
  close();
};

watch(
  () => config.value?.ghostFlags,
  (newFlags, oldFlags) => {
    if (isEqual(newFlags, oldFlags)) {
      return;
    }
    flags.value = cloneDeep(newFlags ?? {});
  },
  { immediate: true, deep: true }
);
</script>
