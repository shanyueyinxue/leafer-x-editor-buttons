import type {
    IApp,
    IColorString,
    ICursorType,
    IDirection4,
    IEditorBase,
    IFill,
    IFontWeight,
    IFourNumber,
    IGroup,
    IPointerEvent,
    IShadowEffect,
    IStroke,
    ITransition,
    IUI,
} from '@leafer-ui/interface'

import type { EditorButton } from './EditorButton'
import type { EditorButtons } from './EditorButtons'


/**
 * 按钮显示条件
 *
 * - `single`   : 单选元素时显示（选中 1 个）
 * - `multiple` : 多选元素时显示（选中 2 个及以上）
 * - `all`      : 所有情况都显示（不限制选中数量，默认值）
 */
export type IEditorButtonShowType = 'single' | 'multiple' | 'all'

/** 按钮交互状态样式（hover / press 时叠加在基础样式之上） */
export interface IEditorButtonStateStyle {
    fill?: IFill
    textColor?: IColorString
    opacity?: number
}

/** 按钮样式，可在默认样式 / 插件实例 / 单个按钮上逐层覆盖 */
export interface IEditorButtonStyle {
    /** 按钮底色 */
    fill?: IFill
    /** 按钮描边 */
    stroke?: IStroke
    /** 描边宽度 */
    strokeWidth?: number
    /** 圆角，如 20 或 [10, 10, 0, 0] */
    cornerRadius?: number | number[]
    /** 文字与按钮边缘的内边距，如 [7, 10] */
    padding?: IFourNumber
    /** 文字颜色 */
    textColor?: IColorString
    /** 文字大小 */
    fontSize?: number
    fontFamily?: string
    fontWeight?: IFontWeight
    cursor?: ICursorType
    opacity?: number
    /** 鼠标移入样式 */
    hover?: IEditorButtonStateStyle
    /** 按下样式 */
    press?: IEditorButtonStateStyle
}

/** 面板外观样式（整体面板与帮助栏共用） */
export interface IEditorButtonsSurfaceStyle {
    /** 背景色 */
    fill?: IFill
    /** 描边 */
    stroke?: IStroke
    /** 描边宽度 */
    strokeWidth?: number
    /** 圆角，如 12 或 [12, 12, 0, 0] */
    cornerRadius?: number | number[]
    /** 内容与边缘的间距，如 [4, 6]；有背景时默认为 4 */
    padding?: IFourNumber
    opacity?: number
    /** 阴影，如 { x: 0, y: 2, blur: 8, color: '#00000022' } */
    shadow?: IShadowEffect | IShadowEffect[]
}

/** 面板交互状态样式（hover / press 时叠加在基础样式之上） */
export interface IEditorButtonsGroupStateStyle {
    fill?: IFill
    stroke?: IStroke
    strokeWidth?: number
    cornerRadius?: number | number[]
    opacity?: number
    shadow?: IShadowEffect | IShadowEffect[]
    /** 该状态的过渡动画（需安装 @leafer-in/animate 才会生效） */
    transition?: ITransition
}

/** 按钮整体（容器）样式，用于把一排按钮做成一个整体面板 */
export interface IEditorButtonsGroupStyle extends IEditorButtonsSurfaceStyle {
    /** 鼠标移入按钮或面板时的样式 */
    hover?: IEditorButtonsGroupStateStyle
    /** 按下按钮时的样式 */
    press?: IEditorButtonsGroupStateStyle
    /** 状态切换的过渡动画（需安装 @leafer-in/animate 才会生效） */
    transition?: ITransition
}

/** 帮助栏样式 */
export interface IEditorButtonsHelpStyle extends IEditorButtonsSurfaceStyle {
    /** 帮助文字颜色 */
    textColor?: IColorString
    /** 帮助文字大小 */
    fontSize?: number
    fontFamily?: string
    fontWeight?: IFontWeight
}

/** 回调（onclick / show / text）中的上下文数据 */
export interface IEditorButtonContext {
    /** 插件实例 */
    buttons: EditorButtons
    /** App 实例 */
    app: IApp
    /** 编辑器实例，即 app.editor */
    editor: IEditorBase
    /** 当前按钮 */
    button: EditorButton
    /** 当前选中的元素列表 */
    list: IUI[]
    /** 当前选中的元素，等同 editor.target */
    target?: IUI | IUI[]
    /** 选中数量 */
    count: number
    /** 是否单选 */
    single: boolean
    /** 是否多选 */
    multiple: boolean
}

/** 点击回调，event 为指针事件（PointerEvent.TAP） */
export interface IEditorButtonClickFunction {
    (event: IPointerEvent, context: IEditorButtonContext): void
}

/** 显示回调，返回 true 显示，返回假值隐藏（可选，在 showType 之后生效） */
export interface IEditorButtonShowFunction {
    (context: IEditorButtonContext): boolean
}

/**
 * 文字 / 帮助回调
 *
 * 返回 `''` 或其他非字符串时，回到默认文字（`text` / `help`）
 */
export interface IEditorButtonTextFunction {
    (context: IEditorButtonContext): string
}

/** 帮助回调，返回鼠标悬浮时显示在帮助栏里的文字 */
export interface IEditorButtonHelpFunction {
    (context: IEditorButtonContext): string
}

/** 单个按钮配置 */
export interface IEditorButtonOptions {
    /** 按钮唯一标识，用于 remove / get，不传则自动生成 */
    id?: string
    /**
     * 默认文字（按钮初始文字，也是 getText 返回空时的兜底文字）
     *
     * 想要按钮有时不显示文字，把这里设为 `''`
     */
    text?: string
    /**
     * 动态文字回调，每次刷新时计算
     *
     * 返回 `''` 或非字符串时，回到 `text` 默认文字
     */
    getText?: IEditorButtonTextFunction
    /**
     * 帮助文字，鼠标悬浮在按钮上时显示在帮助栏里
     *
     * 可配合 `helpText` 选项作为其它按钮的默认提示
     */
    help?: string
    /**
     * 动态帮助回调，每次悬浮时计算
     *
     * 返回 `''` 或非字符串时，回到 `help` 默认帮助文字
     */
    getHelp?: IEditorButtonHelpFunction
    /** 显示条件，默认为 `all`，可传数组（满足任意一个即可） */
    showType?: IEditorButtonShowType | IEditorButtonShowType[]
    /** 显示回调（可选），返回 true 显示 */
    show?: IEditorButtonShowFunction
    /** 点击回调 */
    onclick?: IEditorButtonClickFunction
    /** 按钮样式，覆盖插件默认样式 */
    style?: IEditorButtonStyle
    /** 静态显示开关，传 false 时按钮始终不显示，默认为 true */
    visible?: boolean
}

/** 插件可选项 */
export interface IEditorButtonsOptions {
    /** 初始按钮列表 */
    buttons?: IEditorButtonOptions[]
    /** 按钮之间的间距，默认 8 */
    gap?: number
    /** 覆盖插件默认样式（按钮样式） */
    style?: IEditorButtonStyle
    /** 覆盖按钮整体样式（背景、圆角、内边距等） */
    groupStyle?: IEditorButtonsGroupStyle
    /** 按钮组方位，默认底部；覆盖 app.editor.config.buttonsDirection */
    direction?: IDirection4
    /** 按钮组方位是否固定（不随元素旋转），覆盖 app.editor.config.buttonsFixed */
    fixed?: boolean
    /** 按钮组与编辑框的外边距，覆盖 app.editor.config.buttonsMargin */
    margin?: number
    /**
     * 按钮是否竖向排列
     *
     * 不传时自动判断：`direction` 为 `left` / `right` 时竖排，其余横排
     */
    vertical?: boolean
    /**
     * 是否启用帮助栏
     *
     * 不传时自动判断：只要有一个按钮设置了 `help` / `getHelp`，或设置了 `helpText`，就启用
     */
    help?: boolean
    /** 帮助栏默认文案，鼠标悬浮在未单独设置 help 的按钮上时显示 */
    helpText?: string
    /** 覆盖帮助栏默认样式 */
    helpStyle?: IEditorButtonsHelpStyle
    /**
     * 帮助栏出现位置
     *
     * - `mouse`（默认）: 跟随鼠标
     * - `panel`: 固定在按钮面板外侧
     */
    helpPlacement?: 'mouse' | 'panel'
    /** 帮助栏相对鼠标的偏移，默认 14 */
    helpOffset?: number
    /** 帮助栏与按钮面板的间距（`helpPlacement: 'panel'` 时生效），默认 6 */
    helpGap?: number
    /** 触摸端点击按钮时，短暂显示该按钮的帮助，默认 false（触摸端没有悬浮态） */
    helpOnTap?: boolean
    /** helpOnTap 的显示时长（毫秒），默认 1200 */
    helpDuration?: number
    /** 自定义挂载容器，默认为编辑器本身（app.editor） */
    host?: IGroup
}
