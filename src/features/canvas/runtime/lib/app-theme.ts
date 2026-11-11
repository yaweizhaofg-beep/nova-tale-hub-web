import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";
import { colors } from "@/shared";
import { canvasFontFamily, canvasThemes } from "./canvas-theme";

const neutral = {
    light: {
        primary: "#171717",
        primaryHover: "#000000",
        primaryText: "#ffffff",
        menuBg: "#f5f5f5",
        menuText: "#171717",
        selectActiveBg: "#f5f5f5",
        selectSelectedBg: "#f0f0f0",
        selectText: "#171717",
        tableSelectedBg: "rgba(17, 17, 17, 0.05)",
        tableSelectedHoverBg: "rgba(17, 17, 17, 0.08)",
    },
    dark: {
        primary: colors.accent,
        primaryHover: colors.accentLight,
        primaryText: "#171717",
        menuBg: colors.bgHover,
        menuText: colors.textPrimary,
        selectActiveBg: colors.bgHover,
        selectSelectedBg: colors.bgActive,
        selectText: colors.accent,
        tableSelectedBg: colors.bgActive,
        tableSelectedHoverBg: colors.accentDim,
    },
};

export function getAntThemeConfig(dark: boolean): ThemeConfig {
    const color = dark ? neutral.dark : neutral.light;
    const palette = canvasThemes[dark ? "dark" : "light"];
    const inputFocus = {
        activeBorderColor: "var(--ant-color-border)",
        activeShadow: "none",
    };

    return {
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        cssVar: { key: dark ? "infinite-canvas-dark" : "infinite-canvas-light" },
        token: {
            fontFamily: canvasFontFamily,
            colorPrimary: color.primary,
            colorInfo: color.primary,
            colorLink: color.primary,
            colorLinkHover: color.primaryHover,
            colorLinkActive: color.primary,
            colorTextLightSolid: color.primaryText,
            ...(dark ? {
                colorBgContainer: colors.bgSurface,
                colorBgElevated: colors.bgSurface,
                colorBgMask: "rgba(4,5,8,.7)",
                colorBorder: colors.borderStrong,
                colorBorderSecondary: colors.border,
                colorText: colors.textPrimary,
                colorTextSecondary: colors.textSecondary,
                colorTextPlaceholder: colors.textMuted,
            } : {}),
        },
        components: {
            Button: {
                primaryShadow: "none",
            },
            Input: inputFocus,
            InputNumber: inputFocus,
            Modal: {
                contentBg: palette.node.fill,
                headerBg: "transparent",
                footerBg: "transparent",
                titleColor: palette.node.text,
                titleFontSize: 16,
                borderRadiusLG: 16,
            },
            Popover: {
                borderRadiusLG: 12,
            },
            Segmented: {
                trackBg: palette.toolbar.itemHover,
                itemColor: palette.node.muted,
                itemSelectedBg: palette.toolbar.activeBg,
                itemSelectedColor: palette.toolbar.activeText,
            },
            Menu: {
                itemActiveBg: color.menuBg,
                itemHoverBg: color.menuBg,
                itemSelectedBg: color.menuBg,
                itemSelectedColor: color.menuText,
                darkItemHoverBg: neutral.dark.menuBg,
                darkItemSelectedBg: neutral.dark.menuBg,
                darkItemSelectedColor: neutral.dark.menuText,
            },
            Select: {
                activeBorderColor: inputFocus.activeBorderColor,
                activeOutlineColor: "transparent",
                optionActiveBg: color.selectActiveBg,
                optionSelectedBg: color.selectSelectedBg,
                optionSelectedColor: color.selectText,
            },
            Table: {
                rowSelectedBg: color.tableSelectedBg,
                rowSelectedHoverBg: color.tableSelectedHoverBg,
            },
        },
    };
}
