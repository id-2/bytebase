<template>
  <div class="space-y-4" v-bind="$attrs">
    <div class="flex items-center">
      <div class="flex-1">
        <div class="flex items-center">
          <p class="text-lg font-medium leading-7 text-main flex">
            {{ $t("database.secret.self") }}
          </p>
          <FeatureBadge
            :feature="PlanFeature.FEATURE_DATABASE_SECRET_VARIABLES"
            class="ml-2"
            :instance="database.instanceResource"
          />
        </div>
        <div class="textinfolabel">
          <i18n-t keypath="database.secret.description">
            <template #guide>
              <a
                href="https://docs.bytebase.com/change-database/secret?source=console"
                target="_blank"
                class="normal-link"
              >
                {{ $t("common.detailed-guide") }}</a
              >
            </template>
          </i18n-t>
        </div>
      </div>
      <div class="flex justify-end">
        <NButton type="primary" :disabled="!allowEdit" @click="showDetail()">
          {{ $t("database.secret.new") }}
        </NButton>
      </div>
    </div>
    <FeatureAttention
      :feature="PlanFeature.FEATURE_DATABASE_SECRET_VARIABLES"
      :instance="database.instanceResource"
    />
    <div>
      <NDataTable
        size="small"
        :columns="columns"
        :data="secretList"
        :loading="!ready"
        :striped="true"
        :bordered="true"
      />
    </div>

    <Drawer
      :show="!!detail"
      width="auto"
      @update:show="(show: boolean) => !show && hideDetail()"
    >
      <DrawerContent
        :title="
          detail?.mode === 'CREATE'
            ? $t('database.secret.new')
            : $t('database.secret.edit')
        "
        :closable="true"
        class="w-[30rem] max-w-[100vw] relative"
      >
        <template v-if="detail">
          <div class="flex flex-col gap-y-4">
            <div class="flex flex-col gap-y-2">
              <div class="textlabel">
                {{ $t("common.name") }}
                <span class="ml-0.5 text-error">*</span>
              </div>
              <div>
                <NInput
                  v-model:value="editableName"
                  :disabled="detail.mode === 'UPDATE'"
                  :placeholder="$t('database.secret.name-placeholder')"
                  :status="
                    detail.dirty && detail.errors.length > 0
                      ? 'error'
                      : undefined
                  "
                />
              </div>
              <ul class="text-sm">
                <li v-if="detail.mode === 'CREATE'" class="text-warning">
                  {{ $t("database.secret.validation.cannot-be-changed-later") }}
                </li>
                <template v-if="detail.dirty">
                  <li
                    v-for="(err, i) in detail.errors"
                    :key="i"
                    class="text-error"
                  >
                    {{ err }}
                  </li>
                </template>
              </ul>
            </div>

            <div class="flex flex-col gap-y-2">
              <div class="textlabel">
                {{ $t("database.secret.value") }}
                <span class="ml-0.5 text-error">*</span>
              </div>
              <div>
                <NInput
                  v-model:value="detail.secret.value"
                  type="textarea"
                  :autosize="{ minRows: 3, maxRows: 10 }"
                  :placeholder="$t('database.secret.value-placeholder')"
                  :status="
                    detail.mode === 'CREATE' &&
                    detail.dirty &&
                    detail.secret.value === ''
                      ? 'error'
                      : undefined
                  "
                />
              </div>
            </div>

            <div class="flex flex-col gap-y-2">
              <div class="textlabel">
                {{ $t("common.description") }}
              </div>
              <div>
                <NInput
                  v-model:value="detail.secret.description"
                  type="textarea"
                  :autosize="{ minRows: 3, maxRows: 10 }"
                  :placeholder="$t('database.secret.description-placeholder')"
                />
              </div>
            </div>
          </div>

          <div
            v-if="detail.loading"
            class="absolute inset-0 z-10 bg-white/50 flex flex-col items-center justify-center"
          >
            <BBSpin />
          </div>
        </template>

        <template #footer>
          <div class="flex items-center justify-end gap-x-2">
            <NButton @click="detail = undefined">{{
              $t("common.cancel")
            }}</NButton>
            <NButton type="primary" :disabled="!allowSave" @click="handleSave">
              {{
                detail?.mode === "CREATE"
                  ? $t("common.save")
                  : $t("common.update")
              }}
            </NButton>
          </div>
        </template>
      </DrawerContent>
    </Drawer>
  </div>
  <FeatureModal
    :feature="PlanFeature.FEATURE_DATABASE_SECRET_VARIABLES"
    :open="showFeatureModal"
    :instance="database.instanceResource"
    @cancel="showFeatureModal = false"
  />
</template>

<script setup lang="tsx">
import { cloneDeep } from "lodash-es";
import { NButton, NInput, NDataTable } from "naive-ui";
import type { DataTableColumn } from "naive-ui";
import { computed, ref, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { BBSpin } from "@/bbkit";
import {
  FeatureAttention,
  FeatureBadge,
  FeatureModal,
} from "@/components/FeatureGuard";
import { Drawer, DrawerContent, SpinnerButton } from "@/components/v2";
import { create } from "@bufbuild/protobuf";
import {
  pushNotification,
  useDatabaseSecretStore,
  useSubscriptionV1Store,
} from "@/store";
import { type ComposedDatabase } from "@/types";
import type { Secret } from "@/types/proto-es/v1/database_service_pb";
import { SecretSchema } from "@/types/proto-es/v1/database_service_pb";
import { PlanFeature } from "@/types/proto-es/v1/subscription_service_pb";

export type Detail = {
  secret: Secret;
  mode: "CREATE" | "UPDATE";
  loading: boolean;
  dirty: boolean;
  errors: string[];
};

const props = defineProps<{
  database: ComposedDatabase;
  allowEdit: boolean;
  allowDelete: boolean;
}>();

const store = useDatabaseSecretStore();
const { t } = useI18n();
const secretList = ref<Secret[]>([]);
const ready = ref(false);
const parent = computed(() => {
  return props.database.name;
});
const detail = ref<Detail>();
const showFeatureModal = ref(false);
const subscriptionV1Store = useSubscriptionV1Store();

const columns = computed((): DataTableColumn<Secret>[] => {
  return [
    {
      title: t("common.name"),
      key: "name",
      render: (secret) => extractSecretName(secret.name),
    },
    {
      title: t("common.description"),
      key: "description",
    },
    {
      title: t("common.operations"),
      key: "operations",
      width: 200,
      render: (secret) => (
        <div class="flex gap-x-1">
          <NButton
            size="tiny"
            disabled={!props.allowEdit}
            onClick={() => showDetail(secret)}
          >
            {t("common.edit")}
          </NButton>
          {props.allowDelete && (
            <SpinnerButton
              size="tiny"
              tooltip={t("database.secret.delete-tips")}
              onConfirm={() => handleDelete(secret)}
            >
              {t("common.delete")}
            </SpinnerButton>
          )}
        </div>
      ),
    },
  ];
});

const extractSecretName = (name: string) => {
  const pattern = /(?:^|\/)secrets\/(.+?)(?:$|\/)/;
  const match = name.match(pattern);
  if (match) return match[1];
  return "";
};

const hasSecretFeature = computed(() => {
  return subscriptionV1Store.hasInstanceFeature(
    PlanFeature.FEATURE_DATABASE_SECRET_VARIABLES,
    props.database.instanceResource
  );
});

const showDetail = (secret?: Secret) => {
  if (!hasSecretFeature.value) {
    showFeatureModal.value = true;
    return;
  }
  detail.value = {
    secret: secret ? cloneDeep(secret) : create(SecretSchema, {}),
    mode: secret ? "UPDATE" : "CREATE",
    loading: false,
    dirty: false,
    errors: [],
  };
  nextTick(() => {
    if (detail.value) {
      detail.value.dirty = false;
    }
  });
};

const validate = (detail: Detail) => {
  const { secret, mode } = detail;
  const errors: string[] = [];
  if (mode === "CREATE") {
    if (secretList.value.find((s) => s.name === secret.name)) {
      errors.push(t("database.secret.validation.duplicated-name"));
    }
    const name = editableName.value;
    if (!name) {
      errors.push(t("database.secret.validation.name-is-required"));
    } else if (name.match(/^BYTEBASE_/)) {
      errors.push(
        t("database.secret.validation.name-cannot-prefix-with-bytebase")
      );
    } else if (name.match(/^[0-9]/)) {
      errors.push(
        t("database.secret.validation.name-cannot-start-with-number")
      );
    } else if (!name.match(/^[A-Z0-9_]{0,}$/)) {
      errors.push(t("database.secret.validation.name-pattern-mismatch"));
    }
  }
  return errors;
};

watch(
  [() => detail.value?.secret],
  () => {
    if (detail.value) {
      detail.value.dirty = true;
      detail.value.errors = validate(detail.value);
    }
  },
  { deep: true }
);

const allowSave = computed(() => {
  if (!detail.value) return false;
  return detail.value.errors.length === 0;
});

const hideDetail = () => {
  detail.value = undefined;
};

const editableName = computed({
  get() {
    if (!detail.value) return "";
    return extractSecretName(detail.value.secret.name);
  },
  set(value) {
    if (!detail.value) return;
    detail.value.secret.name = `${parent.value}/secrets/${value}`;
  },
});

const upsertSecret = (secret: Secret) => {
  const index = secretList.value.findIndex((s) => s.name === secret.name);
  if (index >= 0) {
    secretList.value[index] = secret;
  } else {
    secretList.value.push(secret);
  }
};

const handleSave = async () => {
  if (!detail.value) return;
  detail.value.loading = true;
  if (!hasSecretFeature.value) {
    showFeatureModal.value = true;
    return;
  }
  try {
    const { secret, mode, errors } = detail.value;
    if (errors.length > 0) return;
    const updateMask: Array<keyof Secret> = ["description"];
    if (mode === "CREATE" || secret.value) {
      updateMask.push("value");
    }

    const updated = await store.upsertSecret(
      secret,
      updateMask,
      mode === "CREATE"
    );
    upsertSecret(updated);
    detail.value = undefined;

    pushNotification({
      module: "bytebase",
      style: "SUCCESS",
      title: mode === "CREATE" ? t("common.created") : t("common.updated"),
    });
  } finally {
    if (detail.value) {
      detail.value.loading = false;
    }
  }
};

const handleDelete = async (secret: Secret) => {
  if (!hasSecretFeature.value) {
    showFeatureModal.value = true;
    return;
  }
  try {
    await store.deleteSecret(secret.name);
    const index = secretList.value.findIndex((s) => s.name === secret.name);
    if (index >= 0) {
      secretList.value.splice(index, 1);
    }
    pushNotification({
      module: "bytebase",
      style: "SUCCESS",
      title: t("common.deleted"),
    });
  } catch {
    // nothing to do since exceptions are already handled
  }
};

watch(
  () => props.database.name,
  async () => {
    ready.value = false;
    try {
      const list = await store.fetchSecretList(parent.value);
      secretList.value = list;
    } catch {
      secretList.value = [];
    } finally {
      ready.value = true;
    }
  },
  { immediate: true }
);
</script>
