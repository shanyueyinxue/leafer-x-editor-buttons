import { Box, PointerEvent, Text } from '@leafer-ui/core'

import { copyStyle, mergeStyle } from './style'
import { setAttrs } from './util'

import type { EditorButtons } from './EditorButtons'
import type {
    IEditorButtonContext,
    IEditorButtonOptions,
    IEditorButtonShowType,
    IEditorButtonStateStyle,
    IEditorButtonStyle,
} from './type'
import type { IBox, IText, IUIInputData, IPointerEvent } from '@leafer-ui/interface'


let autoId = 0

const showTypes: IEditorButtonShowType[] = ['single', 'multiple', 'all']

/** 当前选中的元素数量是否满足显示条件 */
export function matchShowType(showType: IEditorButtonShowType | IEditorButtonShowType[], count: number): boolean {
    if (!showType) return true
    const list = Array.isArray(showType) ? showType : [showType]
    for (let i = 0; i < list.length; i++) {
        const type = list[i]
        if (type === 'all') return true
        if (type === 'single' && count === 1) return true
        if (type === 'multiple' && count > 1) return true
    }
    return false
}

/** 补全 showType，过滤非法值 */
export function formatShowType(showType: IEditorButtonShowType | IEditorButtonShowType[] | undefined): IEditorButtonShowType[] {
    if (!showType) return ['all']
    const list = (Array.isArray(showType) ? showType : [showType]).filter(type => showTypes.includes(type))
    return list.length ? list : ['all']
}


/**
 * 编辑器底部按钮
 *
 * 由 [[EditorButtons]] 创建，可读取 node / textNode 做进一步自定义
 */
export class EditorButton {

    /** 按钮唯一标识 */
    public id: string

    /** 插件实例 */
    public readonly plugin: EditorButtons

    /** 按钮的显示元素（Box + Text） */
    public readonly node: IBox

    /** 按钮文字元素 */
    public readonly textNode: IText

    protected __options: IEditorButtonOptions
    protected __style: IEditorButtonStyle
    protected __text = ''
    protected __visible = true
    protected __hovered = false
    protected __pressed = false
    protected __destroyed = false

    constructor(plugin: EditorButtons, options: IEditorButtonOptions) {
        this.plugin = plugin
        this.__options = { ...options }
        this.__style = mergeStyle(options.style)
        this.id = options.id || `editor-button-${++autoId}`

        this.textNode = new Text({ text: '' })
        this.node = new Box({ cursor: 'pointer' })
        this.node.add(this.textNode)

        this.applyStyle()
        this.listen()
    }


    /** 按钮配置 */
    public get options(): IEditorButtonOptions { return this.__options }

    /** 按钮文字 */
    public get text(): string { return this.__text }

    /** 是否显示 */
    public get visible(): boolean { return this.__visible }

    /** 鼠标是否悬浮在按钮上 */
    public get hovered(): boolean { return this.__hovered }

    /** 是否正在被按下 */
    public get pressed(): boolean { return this.__pressed }

    /** 按钮是否已销毁 */
    public get destroyed(): boolean { return this.__destroyed }

    /** 实际生效的样式（默认样式 -> 插件实例样式 -> 按钮样式） */
    public get style(): IEditorButtonStyle { return mergeStyle(this.plugin.style, this.__style) }

    /** 显示条件 */
    public get showType(): IEditorButtonShowType[] { return formatShowType(this.__options.showType) }


    // 操作方法

    /** 局部修改按钮配置，会立即刷新 */
    public set(options: Partial<IEditorButtonOptions>): this {
        const { style, ...rest } = options
        Object.assign(this.__options, rest)
        if (style) copyStyle(this.__style, style)
        this.plugin.update()
        return this
    }

    /** 覆盖按钮样式，会立即刷新 */
    public setStyle(style: IEditorButtonStyle): this {
        copyStyle(this.__style, style)
        this.applyStyle()
        this.plugin.layout()
        return this
    }

    /** 设置默认文字（会立即刷新，并且后续刷新会一直使用这个文字） */
    public setText(text: string): this {
        this.__options.text = text
        this.__text = text
        if (this.textNode.text !== text) this.textNode.text = text
        return this
    }

    /** 计算当前显示的文字：getText 返回空时回到 text 默认文字 */
    public getText(context: IEditorButtonContext): string {
        const { text, getText } = this.__options
        let value = typeof text === 'string' ? text : ''

        if (getText) {
            const result = getText(context)
            if (typeof result === 'string' && result !== '') value = result
        }

        return value
    }

    /** 计算当前帮助文字：getHelp 返回空时回到 help 默认帮助文字 */
    public getHelp(context: IEditorButtonContext): string {
        const { help, getHelp } = this.__options
        let value = typeof help === 'string' ? help : ''

        if (getHelp) {
            const result = getHelp(context)
            if (typeof result === 'string' && result !== '') value = result
        }

        return value
    }

    /** 移除自己 */
    public remove(): void { this.plugin.remove(this) }

    /** 销毁自己 */
    public destroy(): void {
        if (this.__destroyed) return
        this.__destroyed = true
        this.node.destroy()
    }


    // 内部

    /** 根据当前编辑器状态刷新文字、显示、样式 */
    public update(context: IEditorButtonContext): void {
        if (this.__destroyed) return
        this.updateText(context)
        this.updateVisible(context)
        this.applyStyle()
    }

    /** 重新应用样式（含 hover / press 状态） */
    public applyStyle(): void {
        const style = this.style
        const state = this.getStateStyle()

        const boxData: IUIInputData = {
            fill: state && state.fill !== undefined ? state.fill : style.fill,
            stroke: style.stroke,
            strokeWidth: style.strokeWidth,
            cornerRadius: style.cornerRadius,
            cursor: style.cursor,
            opacity: state && state.opacity !== undefined ? state.opacity : style.opacity,
        }

        const textData: IUIInputData = {
            fill: state && state.textColor !== undefined ? state.textColor : style.textColor,
            fontSize: style.fontSize,
            fontFamily: style.fontFamily,
            fontWeight: style.fontWeight,
            padding: style.padding,
        }

        setAttrs(this.node, boxData)
        setAttrs(this.textNode, textData)
    }

    protected getStateStyle(): IEditorButtonStateStyle {
        const style = this.style
        if (this.__pressed && style.press) return style.press
        if (this.__hovered && style.hover) return style.hover
        return undefined
    }

    protected updateText(context: IEditorButtonContext): void {
        const text = this.getText(context)
        this.__text = text
        if (this.textNode.text !== text) this.textNode.text = text
    }

    protected updateVisible(context: IEditorButtonContext): void {
        const { visible, show } = this.__options
        let value = visible !== false

        if (value && !matchShowType(this.showType, context.count)) value = false
        if (value && show) value = !!show(context)

        this.__visible = value
        // 0 = display: none，隐藏时不占用布局空间
        this.node.visible = value ? true : 0
    }

    protected listen(): void {
        const { node } = this
        node.on(PointerEvent.ENTER, this.onEnter)
        node.on(PointerEvent.LEAVE, this.onLeave)
        node.on(PointerEvent.DOWN, this.onDown)
        node.on(PointerEvent.UP, this.onUp)
        node.on(PointerEvent.TAP, this.onTap)
    }

    protected onEnter = (event: IPointerEvent): void => {
        this.__hovered = true
        this.applyStyle()
        this.plugin.onButtonHover(this, true, event)
    }

    protected onLeave = (): void => {
        this.__hovered = false
        this.__pressed = false
        this.applyStyle()
        this.plugin.onButtonHover(this, false)
        this.plugin.onButtonPress(this, false)
    }

    protected onDown = (): void => {
        this.__pressed = true
        this.applyStyle()
        this.plugin.onButtonPress(this, true)
    }

    protected onUp = (): void => {
        this.__pressed = false
        this.applyStyle()
        this.plugin.onButtonPress(this, false)
    }

    protected onTap = (event: IPointerEvent): void => {
        this.plugin.onButtonTap(this, event)

        const { onclick } = this.__options
        if (onclick) onclick(event, this.plugin.getContext(this))
    }

}
