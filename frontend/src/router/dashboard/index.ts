import type { RouteRecordRaw } from "vue-router";
import BodyLayout from "@/layouts/BodyLayout.vue";
import DashboardLayout from "@/layouts/DashboardLayout.vue";
import IssuesLayout from "@/layouts/IssuesLayout.vue";
import { t } from "@/plugins/i18n";
import MyIssues from "@/views/MyIssues.vue";
import environmentV1Routes from "./environmentV1";
import instanceRoutes from "./instance";
import projectV1Routes from "./projectV1";
import workspaceRoutes from "./workspace";
import { WORKSPACE_ROUTE_MY_ISSUES } from "./workspaceRoutes";
import workspaceSettingRoutes from "./workspaceSetting";

const dashboardRoutes: RouteRecordRaw[] = [
  {
    path: "/",
    component: DashboardLayout,
    children: [
      {
        path: "",
        components: { body: BodyLayout },
        children: [
          ...workspaceRoutes,
          ...workspaceSettingRoutes,
          ...environmentV1Routes,
          ...instanceRoutes,
          ...projectV1Routes,
        ],
      },
      {
        path: "issues",
        components: { body: IssuesLayout },
        props: true,
        meta: {
          title: () => t("common.issues"),
        },
        children: [
          {
            path: "",
            name: WORKSPACE_ROUTE_MY_ISSUES,
            components: {
              content: MyIssues,
            },
          },
        ],
      },
    ],
  },
];

export default dashboardRoutes;
