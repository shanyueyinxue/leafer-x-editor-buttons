import type {
    IEditorButtonsGroupStyle,
    IEditorButtonsHelpStyle,
    IEditorButtonStateStyle,
    IEditorButtonStyle,
} from './type'


/** 内置默认按钮样式，可直接修改（影响之后创建的插件实例） */
export const defaultStyle: IEditorButtonStyle = {
    fill: '#3D7EFF',
    cornerRadius: 20,
    padding: [7, 10],
    textColor: '#FFFFFF',
    fontSize: 12,
    cursor: 'pointer',
    opacity: 1,
    hover: { fill: '#5A93FF' },
    press: { fill: '#2B6BE6' },
}

/** 按钮整体默认样式，默认为空（不绘制背景） */
export const defaultGroupStyle: IEditorButtonsGroupStyle = {}

/** 帮助栏默认样式（深色小胶囊） */
export const defaultHelpStyle: IEditorButtonsHelpStyle = {
    fill: '#1F2A44',
    cornerRadius: 6,
    padding: [4, 8],
    textColor: '#FFFFFF',
    fontSize: 11,
    opacity: 1,
}

const stateKeys = ['hover', 'press']

/** 拷贝一组明确定义的属性（忽略 undefined） */
function copyAttrs(target: Record<string, unknown>, source?: Record<string, unknown>): void {
    if (source) {
        for (const key in source) {
            const value = source[key]
            if (value !== undefined) target[key] = value
        }
    }
}

/** 交互状态样式合并，忽略 undefined */
export function copyStateStyle(target: IEditorButtonStateStyle, source?: IEditorButtonStateStyle): IEditorButtonStateStyle {
    copyAttrs(target as Record<string, unknown>, source as Record<string, unknown>)
    return target
}

/**
 * 按钮样式合并，只覆盖明确传入的值（忽略 undefined）
 *
 * hover / press 会做一层浅合并
 */
export function copyStyle(target: IEditorButtonStyle, source?: IEditorButtonStyle): IEditorButtonStyle {
    if (source) {
        for (const key in source) {
            const value = (source as Record<string, unknown>)[key]
            if (value === undefined) continue

            if (stateKeys.includes(key)) {
                const target_ = target as Record<string, unknown>
                const state = target_[key] || (target_[key] = {})
                copyAttrs(state as Record<string, unknown>, value as Record<string, unknown>)
            } else (target as Record<string, unknown>)[key] = value
        }
    }
    return target
}

/** 合并多个按钮样式为一个新样式 */
export function mergeStyle(...list: (IEditorButtonStyle | undefined)[]): IEditorButtonStyle {
    const style: IEditorButtonStyle = {}
    for (let i = 0; i < list.length; i++) copyStyle(style, list[i])
    return style
}


/** 整体样式合并，只覆盖明确传入的值（忽略 undefined），hover / press 浅合并 */
export function copyGroupStyle(target: IEditorButtonsGroupStyle, source?: IEditorButtonsGroupStyle): IEditorButtonsGroupStyle {
    if (source) {
        for (const key in source) {
            const value = (source as Record<string, unknown>)[key]
            if (value === undefined) continue

            if (stateKeys.includes(key)) {
                const target_ = target as Record<string, unknown>
                const state = target_[key] || (target_[key] = {})
                copyAttrs(state as Record<string, unknown>, value as Record<string, unknown>)
            } else (target as Record<string, unknown>)[key] = value
        }
    }
    return target
}

/** 合并多个整体样式为一个新样式 */
export function mergeGroupStyle(...list: (IEditorButtonsGroupStyle | undefined)[]): IEditorButtonsGroupStyle {
    const style: IEditorButtonsGroupStyle = {}
    for (let i = 0; i < list.length; i++) copyGroupStyle(style, list[i])
    return style
}


/** 帮助栏样式合并，只覆盖明确传入的值（忽略 undefined） */
export function copyHelpStyle(target: IEditorButtonsHelpStyle, source?: IEditorButtonsHelpStyle): IEditorButtonsHelpStyle {
    copyAttrs(target as Record<string, unknown>, source as Record<string, unknown>)
    return target
}

/** 合并多个帮助栏样式为一个新样式 */
export function mergeHelpStyle(...list: (IEditorButtonsHelpStyle | undefined)[]): IEditorButtonsHelpStyle {
    const style: IEditorButtonsHelpStyle = {}
    for (let i = 0; i < list.length; i++) copyHelpStyle(style, list[i])
    return style
}
