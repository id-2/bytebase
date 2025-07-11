<template>
  <div
    v-if="!hidePreview"
    v-show="layoutReady"
    class="overflow-hidden flex flex-col items-stretch shrink-0 transition-all"
    :style="{
      height: expanded ? `${panelHeight}px` : '1rem',
    }"
    :data-parent-height="parentHeight"
  >
    <div
      class="cursor-pointer flex items-center justify-start px-2 gap-1 overflow-y-visible bg-control-bg hover:bg-control-bg-hover"
      :style="{
        height: '1rem',
      }"
      @click="expanded = !expanded"
    >
      <ChevronDownIcon
        class="w-4 h-4 transition-transform"
        :class="expanded ? '' : 'rotate-180'"
      />
      <span v-if="true || expanded" class="text-xs origin-left">
        {{ title }}
      </span>
    </div>
    <div class="relative flex-1 overflow-hidden">
      <MonacoEditor
        v-if="status === 'pending' || status === 'success'"
        :readonly="true"
        :content="data?.trim() ?? ''"
        :options="{
          fontSize: '12px',
          lineHeight: '18px',
        }"
        class="w-full h-full"
      />
      <pre v-if="expanded && status === 'error'" class="text-sm text-error">{{
        error?.message ?? "Unknown error"
      }}</pre>
      <MaskSpinner v-if="status === 'pending'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import {
  refDebounced,
  useElementSize,
  useLocalStorage,
  useParentElement,
} from "@vueuse/core";
import { ChevronDownIcon } from "lucide-vue-next";
import { computed, toRef } from "vue";
import { MonacoEditor } from "@/components/MonacoEditor";
import MaskSpinner from "@/components/misc/MaskSpinner.vue";
import { create } from "@bufbuild/protobuf";
import { databaseServiceClientConnect } from "@/grpcweb";
import type { ComposedDatabase } from "@/types";
import type { DatabaseCatalog } from "@/types/proto-es/v1/database_catalog_service_pb";
import type {
  DatabaseMetadata,
  SchemaMetadata,
} from "@/types/proto-es/v1/database_service_pb";
import { GetSchemaStringRequestSchema } from "@/types/proto-es/v1/database_service_pb";
import { minmax } from "@/utils";
import { extractGrpcErrorMessage } from "@/utils/grpcweb";
import { useSchemaEditorContext } from "../context";

const props = defineProps<{
  db: ComposedDatabase;
  database: DatabaseMetadata;
  schema: SchemaMetadata;
  title: string;
  mocked: { metadata: DatabaseMetadata; catalog: DatabaseCatalog } | undefined;
}>();

const { hidePreview } = useSchemaEditorContext();
const expanded = useLocalStorage("bb.schema-editor.preview.expanded", true);
const parentElement = useParentElement();
const { height: parentHeight } = useElementSize(parentElement);
const layoutReady = computed(() => parentHeight.value > 0);
const panelHeight = computed(() => {
  const min = 8 * 16; // 8rem ~= 6 lines
  const max = 16 * 16; // 16rem ~= 13 lines
  const flexible = parentHeight.value * 0.4;
  return minmax(flexible, min, max);
});

const engine = computed(() => props.db.instanceResource.engine);
const mocked = toRef(props, "mocked");
const debouncedMocked = refDebounced(mocked, 500);

const { status, data, error } = useQuery({
  queryKey: [engine, debouncedMocked],
  queryFn: async () => {
    if (!expanded.value) return "";
    if (!debouncedMocked.value) return "";
    const { metadata } = debouncedMocked.value;

    try {
      const newMetadata = metadata;
      const request = create(GetSchemaStringRequestSchema, {
        name: props.db.name,
        metadata: newMetadata,
      });
      const response = await databaseServiceClientConnect.getSchemaString(request);
      return response.schemaString;
    } catch (err) {
      return Promise.reject(new Error(extractGrpcErrorMessage(err)));
    }
  },
});
</script>
