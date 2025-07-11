<template>
  <div
    class="w-full flex-1 flex flex-col items-center justify-start gap-y-4"
    style="padding-top: calc(clamp(40px, 15vh, 200px))"
  >
    <BytebaseLogo />

    <div
      class="hidden lg:grid items-center gap-4"
      :class="showCreateInstanceButton ? 'grid-cols-3' : 'grid-cols-2'"
    >
      <Button
        v-if="showCreateInstanceButton"
        type="default"
        @click="gotoInstanceCreatePage"
      >
        <template #icon>
          <LayersIcon :stroke-width="1.5" class="w-8 h-8" />
        </template>
        {{ $t("sql-editor.add-a-new-instance") }}
      </Button>
      <Button type="primary" secondary @click="changeConnection">
        <template #icon>
          <LinkIcon :stroke-width="1.5" class="w-8 h-8" />
        </template>
        {{ $t("sql-editor.connect-to-a-database") }}
      </Button>
      <Button type="default" @click="createNewWorksheet">
        <template #icon>
          <SquarePenIcon :stroke-width="1.5" class="w-8 h-8" />
        </template>
        {{ $t("sql-editor.create-a-worksheet") }}
      </Button>
    </div>
    <div class="flex lg:hidden flex-col items-start gap-y-2 w-max">
      <NButton
        type="primary"
        class="!w-full !justify-start"
        @click="changeConnection"
      >
        <template #icon>
          <LinkIcon class="w-4 h-4" />
        </template>
        {{ $t("sql-editor.connect-to-a-database") }}
      </NButton>
      <NButton
        v-if="showCreateInstanceButton"
        type="default"
        class="!w-full !justify-start"
        @click="gotoInstanceCreatePage"
      >
        <template #icon>
          <LayersIcon class="w-4 h-4" />
        </template>
        {{ $t("sql-editor.add-a-new-instance") }}
      </NButton>
      <NButton
        type="default"
        class="!w-full !justify-start"
        @click="createNewWorksheet"
      >
        <template #icon>
          <SquarePenIcon class="w-4 h-4" />
        </template>
        {{ $t("sql-editor.create-a-worksheet") }}
      </NButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LayersIcon, LinkIcon, SquarePenIcon } from "lucide-vue-next";
import { NButton } from "naive-ui";
import { computed } from "vue";
import { useRouter } from "vue-router";
import BytebaseLogo from "@/components/BytebaseLogo.vue";
import { SQL_EDITOR_SETTING_INSTANCE_MODULE } from "@/router/sqlEditor";
import { useSQLEditorTabStore } from "@/store";
import { useSidebarItems as useSettingItems } from "../../Setting/Sidebar";
import { useSQLEditorContext } from "../../context";
import Button from "./Button.vue";

const { showConnectionPanel, asidePanelTab } = useSQLEditorContext();
const { itemList: settingItemList } = useSettingItems();
const router = useRouter();

const showCreateInstanceButton = computed(() => {
  return (
    settingItemList.value.findIndex(
      (item) => item.name === SQL_EDITOR_SETTING_INSTANCE_MODULE
    ) >= 0
  );
});

const changeConnection = () => {
  asidePanelTab.value = "SCHEMA";
  showConnectionPanel.value = true;
};

const createNewWorksheet = () => {
  useSQLEditorTabStore().addTab();
};

const gotoInstanceCreatePage = () => {
  if (
    settingItemList.value.findIndex(
      (item) => item.name === SQL_EDITOR_SETTING_INSTANCE_MODULE
    ) < 0
  ) {
    return;
  }
  router.push({
    name: SQL_EDITOR_SETTING_INSTANCE_MODULE,
    hash: `#add`,
  });
};
</script>
