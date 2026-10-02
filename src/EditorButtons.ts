import { Box, MathHelper, PointerEvent, RenderEvent, Text } from '@leafer-ui/core'

import { EditorButton } from './EditorButton'
import {
    copyGroupStyle,
    copyHelpStyle,
    copyStyle,
    defaultGroupStyle,
    defaultHelpStyle,
    defaultStyle,
    mergeGroupStyle,
    mergeHelpStyle,
    mergeStyle,
} from './style'
import { normalizeVector, setAttrs } from './util'

import type {
    IEditorButtonContext,
    IEditorButtonOptions,
    IEditorButtonsGroupStyle,
    IEditorButtonsHelpStyle,
    IEditorButtonStyle,
    IEditorButtonsOptions,
} from './type'
import type { IApp, IBox, IDirection4, IEditorBase, IEventListenerId, IGroup, IPointData, IPointerEvent, IText, IUI } from '@leafer-ui/interface'


/** EditorEvent.SELECT 的事件名，直接使用字符串可避免依赖 @leafer-in/editor */
const selectEventName = 'editor.select'

/** PointerEvent.MOVE 的事件名 */
const pointerMoveName = 'pointer.move'

/** 元素还没完成布局时，最多等待的渲染帧数 */
const maxWaitRenderTimes = 20

/** 有背景时默认的内容内边距 */
const defaultGroupPadding = 4

const directionList: IDirection4[] = ['top', 'right', 'bottom', 'left']


/** 按钮是否设置了帮助信息 */
export function hasButtonHelp(button: EditorButton): boolean {
    const { help, getHelp } = button.options
    return (typeof help === 'string' && help !== '') || !!getHelp
}


/**
 * 编辑器底部按钮插件
 *
 * 把一组自定义按钮固定放在图形编辑器的编辑框旁边（默认底部），
 * 支持按 单选 / 多选 / 所有情况 控制显示，并支持 onclick / show / text 回调与样式定制。
 *
 * ```ts
 * const buttons = new EditorButtons(app, { gap: 8 })
 *
 * buttons.add({
 *     text: '移除',
 *     showType: 'multiple',
 *     onclick: (e, { list, editor }) => {
 *         list.forEach(item => item.remove())
 *         editor.target = null
 *     }
 * })
 * ```
 *
 * 按钮位置由插件自己计算，元素旋转、翻转后依然正确，
 * 并可通过 direction / fixed / margin 覆盖 app.editor 上的对应配置。
 */
export class EditorButtons {

    /** 内置默认样式，可全局修改 */
    public static defaultStyle: IEditorButtonStyle = defaultStyle

    /** 内置默认整体样式（默认为空，不绘制背景） */
    public static defaultGroupStyle: IEditorButtonsGroupStyle = defaultGroupStyle

    /** 内置默认帮助栏样式 */
    public static defaultHelpStyle: IEditorButtonsHelpStyle = defaultHelpStyle

    /** App 实例 */
    public readonly app: IApp

    /** 按钮容器（面板），可设置整体背景、圆角等样式 */
    public readonly group: IBox

    /** 帮助栏容器（挂在按钮面板外侧，跟随面板一起移动 / 旋转） */
    public readonly helpNode: IBox

    /** 帮助栏文字元素 */
    public readonly helpLabel: IText

    /** 挂在编辑器按钮组上的占位元素，让编辑器保留自身按钮组逻辑（如旋转控制点的方位） */
    protected __anchor: IUI

    /** 按钮列表 */
    protected __list: EditorButton[] = []

    /** 插件实例样式（覆盖默认样式） */
    protected __style: IEditorButtonStyle = {}

    /** 插件实例整体样式 */
    protected __groupStyle: IEditorButtonsGroupStyle = {}

    /** 插件实例帮助栏样式 */
    protected __helpStyle: IEditorButtonsHelpStyle = {}

    protected __host?: IGroup
    protected __gap = 8
    protected __direction: IDirection4 = 'bottom'
    protected __fixed = false
    protected __margin = 12
    protected __vertical?: boolean
    protected __padding: number[] = [0, 0, 0, 0]
    protected __help?: boolean
    protected __helpText = ''
    protected __helpPlacement: 'mouse' | 'panel' = 'mouse'
    protected __helpOffset = 14
    protected __helpGap = 6
    protected __helpOnTap = false
    protected __helpDuration = 1200
    protected __helpButton?: EditorButton
    protected __helpShown = false
    protected __helpTimer?: ReturnType<typeof setTimeout>
    protected __pointer?: IPointData
    protected __pointerLocal = { x: 0, y: 0 }
    protected __hovered = false
    protected __pressed = false
    protected __panelHovered = false
    protected __waitTimes = 0
    protected __ready = false
    protected __destroyed = false
    protected __eventIds: IEventListenerId[] = []
    protected __renderEventId?: IEventListenerId
    protected __waitEventId?: IEventListenerId
    protected __state: (number | boolean)[] = []

    constructor(app: IApp, options: IEditorButtonsOptions = {}) {
        if (!app) throw new Error('[leafer-x-editor-buttons] 缺少 app 参数')
        if (!app.editor) throw new Error('[leafer-x-editor-buttons] 未找到 app.editor，请先安装并启用 @leafer-in/editor 插件，并在 App 中传入 editor 配置')

        const editor = app.editor
        const { config } = editor

        this.app = app
        this.group = new Box({ around: 'center', overflow: 'show', width: 0, height: 0 })
        this.helpNode = new Box({ around: 'center', hittable: false })
        this.helpLabel = new Text({ text: '' })
        this.helpNode.add(this.helpLabel)
        this.__anchor = new Box({ visible: 0, hittable: false })

        this.__host = options.host
        this.__gap = options.gap === undefined ? 8 : options.gap
        this.__vertical = options.vertical
        this.__help = options.help
        this.__helpText = options.helpText || ''
        this.__helpPlacement = options.helpPlacement || 'mouse'
        this.__helpOffset = options.helpOffset === undefined ? 14 : options.helpOffset
        this.__helpGap = options.helpGap === undefined ? 6 : options.helpGap
        this.__helpOnTap = !!options.helpOnTap
        this.__helpDuration = options.helpDuration === undefined ? 1200 : options.helpDuration

        copyStyle(this.__style, options.style)
        copyGroupStyle(this.__groupStyle, options.groupStyle)
        copyHelpStyle(this.__helpStyle, options.helpStyle)

        // 方位 / 固定 / 边距：插件参数优先，未传则沿用编辑器配置
        this.__direction = options.direction || (config.buttonsDirection as IDirection4) || 'bottom'
        this.__fixed = options.fixed === undefined ? !!config.buttonsFixed : options.fixed
        this.__margin = options.margin === undefined ? (config.buttonsMargin === undefined ? 12 : config.buttonsMargin) : options.margin

        this.applyGroupStyle()
        this.applyHelpStyle()
        this.syncEditorConfig()

        editor.buttons.add(this.__anchor)
        this.__eventIds.push(editor.on_(selectEventName, this.onEditorChange, this))
        this.__eventIds.push(editor.on_(pointerMoveName, this.onPointerMove, this))

        const leafer = editor.leafer
        if (leafer) this.__renderEventId = leafer.on_(RenderEvent.START, this.onRenderStart, this)

        this.listenGroup()

        this.__ready = true

        if (options.buttons) this.add(options.buttons)
        else this.update()
    }


    /** 编辑器实例 */
    public get editor(): IEditorBase { return this.app && this.app.editor }

    /** 实际挂载按钮的容器，默认为编辑器本身 */
    public get host(): IGroup { return this.__host || this.editor }

    /** 按钮数量 */
    public get size(): number { return this.__list.length }

    /** 按钮列表 */
    public get list(): EditorButton[] { return this.__list }

    /** 是否已销毁 */
    public get destroyed(): boolean { return this.__destroyed }

    /** 实际生效的按钮样式（默认样式 + 插件实例样式） */
    public get style(): IEditorButtonStyle { return mergeStyle(EditorButtons.defaultStyle, this.__style) }

    /** 整体覆盖插件实例的按钮样式，会立即刷新 */
    public set style(value: IEditorButtonStyle) {
        this.__style = {}
        copyStyle(this.__style, value)
        if (this.__ready) this.refreshStyle()
    }

    /** 实际生效的整体样式（默认整体样式 + 插件实例整体样式） */
    public get groupStyle(): IEditorButtonsGroupStyle { return mergeGroupStyle(EditorButtons.defaultGroupStyle, this.__groupStyle) }

    /** 整体覆盖插件实例的整体样式，会立即刷新 */
    public set groupStyle(value: IEditorButtonsGroupStyle) {
        this.__groupStyle = {}
        copyGroupStyle(this.__groupStyle, value)
        if (this.__ready) this.applyGroupStyle()
    }

    /** 实际生效的帮助栏样式（默认帮助栏样式 + 插件实例帮助栏样式） */
    public get helpStyle(): IEditorButtonsHelpStyle { return mergeHelpStyle(EditorButtons.defaultHelpStyle, this.__helpStyle) }

    /** 整体覆盖插件实例的帮助栏样式，会立即刷新 */
    public set helpStyle(value: IEditorButtonsHelpStyle) {
        this.__helpStyle = {}
        copyHelpStyle(this.__helpStyle, value)
        if (this.__ready) this.applyHelpStyle()
    }

    /** 是否启用帮助栏（不传时按按钮上是否有 help 自动判断） */
    public get help(): boolean {
        if (this.__help !== undefined) return this.__help
        return !!this.__helpText || this.__list.some(button => hasButtonHelp(button))
    }

    public set help(value: boolean) {
        this.__help = value
        this.__helpButton = undefined
        if (this.__ready) this.update() // 需要同步挂载 / 卸载帮助栏
    }

    /** 当前正在显示帮助的按钮 */
    public get helpButton(): EditorButton { return this.__helpButton }

    /** 按钮之间的间距 */
    public get gap(): number { return this.__gap }

    public set gap(value: number) {
        this.__gap = value
        if (this.__ready) this.layout()
    }

    /** 按钮组方位，设置后会同步覆盖 app.editor.config.buttonsDirection */
    public get direction(): IDirection4 { return this.__direction }

    public set direction(value: IDirection4) { this.setDirection(value) }

    /** 按钮组方位是否固定（不随元素旋转），设置后会同步覆盖 app.editor.config.buttonsFixed */
    public get fixed(): boolean { return this.__fixed }

    public set fixed(value: boolean) { this.setFixed(value) }

    /** 按钮是否竖向排列（不传时按方位自动判断：left / right 为竖排） */
    public get vertical(): boolean {
        if (this.__vertical !== undefined) return this.__vertical
        return this.__direction === 'left' || this.__direction === 'right'
    }

    public set vertical(value: boolean) {
        this.__vertical = value
        if (this.__ready) this.layout()
    }

    /** 帮助栏是否正在显示 */
    public get helpShown(): boolean { return this.__helpShown && !!this.group.visible }

    /** 按钮组与编辑框的外边距，设置后会同步覆盖 app.editor.config.buttonsMargin */
    public get margin(): number { return this.__margin }

    public set margin(value: number) { this.setMargin(value) }


    // 添加 / 移除

    /** 添加一组按钮 */
    public add(options: IEditorButtonOptions[], index?: number): EditorButton[]
    /** 添加一个按钮 */
    public add(options: IEditorButtonOptions, index?: number): EditorButton
    public add(options: IEditorButtonOptions | IEditorButtonOptions[], index?: number): EditorButton | EditorButton[] {
        if (Array.isArray(options)) {
            const list: EditorButton[] = []
            options.forEach((item, i) => list.push(this.insert(item, index === undefined ? undefined : index + i)))
            this.update()
            return list
        }
        const button = this.insert(options, index)
        this.update()
        return button
    }

    /** 添加多个按钮，返回插件实例，方便链式调用 */
    public addMany(options: IEditorButtonOptions[]): this {
        this.add(options)
        return this
    }

    /** 移除按钮，支持 id / 按钮实例 / 索引 */
    public remove(target: string | EditorButton | number): boolean {
        const index = this.indexOf(target)
        if (index < 0) return false

        const button = this.__list.splice(index, 1)[0]
        button.destroy()
        if (!this.__destroyed) {
            this.syncHost()
            this.layout()
        }
        return true
    }

    /** 移除全部按钮 */
    public clear(): void {
        const list = this.__list.splice(0)
        list.forEach(button => button.destroy())
        if (!this.__destroyed) {
            this.syncHost()
            this.layout()
        }
    }

    /** 查找按钮索引 */
    public indexOf(target: string | EditorButton | number): number {
        if (typeof target === 'number') return target >= 0 && target < this.__list.length ? target : -1
        for (let i = 0; i < this.__list.length; i++) {
            const button = this.__list[i]
            if (button === target || button.id === target) return i
        }
        return -1
    }

    /** 按 id 查找按钮 */
    public get(id: string): EditorButton { return this.__list[this.indexOf(id)] }

    /** 是否存在指定 id 的按钮 */
    public has(id: string): boolean { return this.indexOf(id) > -1 }

    /** 遍历按钮 */
    public forEach(fn: (button: EditorButton, index: number) => void): void { this.__list.forEach(fn) }


    // 更新

    /** 刷新全部按钮的文字、显示状态、样式与位置（选中元素变化时会自动调用） */
    public update(): this {
        if (this.__destroyed) return this

        const context = this.getContext()
        for (const button of this.__list) {
            context.button = button
            button.update(context)
        }

        this.syncHost()
        this.layout()
        return this
    }

    /** 重新排列按钮，计算整体大小，并定位到编辑框旁边 */
    public layout(): this {
        if (this.__destroyed) return this

        const items: EditorButton[] = []
        const sizes: { x: number; y: number; width: number; height: number }[] = []
        let waiting = false

        for (const button of this.__list) {
            if (!button.visible) continue
            items.push(button)

            const bounds = button.node.boxBounds
            if (bounds.width <= 0 || bounds.height <= 0) waiting = true // 元素还没完成布局，等渲染后重新排列
            sizes.push(bounds)
        }

        const vertical = this.vertical
        const [top, right, bottom, left] = this.__padding
        const gap = this.__gap
        const last = items.length - 1

        let contentWidth = 0
        let contentHeight = 0

        if (vertical) {
            // 竖排：按钮依次向下排列，内容宽度取最宽的按钮
            for (let i = 0; i < sizes.length; i++) {
                if (sizes[i].width > contentWidth) contentWidth = sizes[i].width
                contentHeight += sizes[i].height + (i < last ? gap : 0)
            }
        } else {
            // 横排：按钮依次向右排列，内容高度取最高的按钮
            for (let i = 0; i < sizes.length; i++) {
                contentWidth += sizes[i].width + (i < last ? gap : 0)
                if (sizes[i].height > contentHeight) contentHeight = sizes[i].height
            }
        }

        let offset = 0
        for (let i = 0; i < items.length; i++) {
            const { node } = items[i]
            const bounds = sizes[i]

            const targetX = vertical ? left + (contentWidth - bounds.width) / 2 : left + offset
            const targetY = vertical ? top + offset : top + (contentHeight - bounds.height) / 2

            if (node.x !== targetX) node.x = targetX
            if (node.y !== targetY) node.y = targetY

            offset += (vertical ? bounds.height : bounds.width) + gap
        }

        const width = left + contentWidth + right
        const height = top + contentHeight + bottom

        if (this.group.width !== width) this.group.width = width
        if (this.group.height !== height) this.group.height = height

        // 帮助栏内容（位置在 place() 中计算）
        const helpText = this.help ? this.getHelpText() : ''
        this.__helpShown = !!helpText

        if (this.__helpShown) {
            if (this.helpLabel.text !== helpText) this.helpLabel.text = helpText
            if (this.helpNode.boxBounds.width <= 0 || this.helpNode.boxBounds.height <= 0) waiting = true
        }

        if (waiting) this.waitRender()
        this.place()
        return this
    }

    /** 当前要显示在帮助栏里的文字（没有则为空） */
    public getHelpText(): string {
        const button = this.__helpButton
        if (!button) return ''
        const text = button.getHelp(this.getContext(button))
        return text || this.__helpText || ''
    }

    /** 计算按钮组的位置与朝向（元素旋转、翻转后依然正确） */
    public place(): this {
        if (this.__destroyed) return this

        const editor = this.editor
        if (!editor) return this

        // 跟随编辑框的显示状态（无选中元素、锁定、hideOnMove 等都会隐藏）
        const visible = !!(editor.editBox && editor.editBox.visible && editor.buttons && editor.buttons.visible)
        this.group.visible = visible ? true : 0
        if (!visible) {
            this.helpNode.visible = 0
            return this
        }

        const rect = editor.editBox.rect
        if (!rect) return this

        const bounds = rect.worldBoxBounds
        const boxWidth = bounds.width
        const boxHeight = bounds.height
        if (boxWidth <= 0 || boxHeight <= 0) return this

        const width = this.group.width as number
        const height = this.group.height as number
        const direction = this.__direction
        const distance = this.__margin + (direction === 'left' || direction === 'right' ? width : height) / 2
        const isFixed = this.__fixed

        let anchor: IPointData
        let unit: IPointData
        let rotation = 0

        if (isFixed) {
            // 固定方位：使用选中范围的世界包围盒 + 世界轴向，按钮始终保持水平/垂直
            unit = direction === 'left' || direction === 'right' ? { x: 1, y: 0 } : { x: 0, y: 1 }
            switch (direction) {
                case 'top': anchor = { x: bounds.x + boxWidth / 2, y: bounds.y }; break
                case 'bottom': anchor = { x: bounds.x + boxWidth / 2, y: bounds.y + boxHeight }; break
                case 'left': anchor = { x: bounds.x, y: bounds.y + boxHeight / 2 }; break
                default: anchor = { x: bounds.x + boxWidth, y: bounds.y + boxHeight / 2 }
            }
        } else {
            // 跟随元素旋转：使用编辑框自身的坐标系
            const localWidth = rect.width
            const localHeight = rect.height
            const origin = rect.getWorldPoint({ x: 0, y: 0 })
            const xPoint = rect.getWorldPoint({ x: 1, y: 0 })
            const yPoint = rect.getWorldPoint({ x: 0, y: 1 })

            const unitX = normalizeVector(xPoint.x - origin.x, xPoint.y - origin.y)
            const unitY = normalizeVector(yPoint.x - origin.x, yPoint.y - origin.y)
            rotation = Math.atan2(unitX.y, unitX.x) * 180 / Math.PI

            switch (direction) {
                case 'top': anchor = rect.getWorldPoint({ x: localWidth / 2, y: 0 }); unit = unitY; break
                case 'bottom': anchor = rect.getWorldPoint({ x: localWidth / 2, y: localHeight }); unit = unitY; break
                case 'left': anchor = rect.getWorldPoint({ x: 0, y: localHeight / 2 }); unit = unitX; break
                default: anchor = rect.getWorldPoint({ x: localWidth, y: localHeight / 2 }); unit = unitX
            }
        }

        // 朝编辑框外侧偏移
        const sign = direction === 'top' || direction === 'left' ? -1 : 1
        const worldX = anchor.x + unit.x * distance * sign
        const worldY = anchor.y + unit.y * distance * sign

        // 世界坐标 -> 编辑器内的坐标
        const point = { x: 0, y: 0 }
        editor.worldToInner({ x: worldX, y: worldY }, point)

        if (this.group.x !== point.x) this.group.x = point.x
        if (this.group.y !== point.y) this.group.y = point.y
        if (this.group.rotation !== rotation) this.group.rotation = rotation

        // 帮助栏：跟随鼠标，或固定挂在面板外侧
        this.helpNode.visible = this.__helpShown ? true : 0
        if (this.__helpShown && this.helpNode.parent) {
            this.placeHelp(worldX, worldY, rotation, unit, isFixed)
        }

        return this
    }

    /** 计算帮助栏的位置 */
    protected placeHelp(panelX: number, panelY: number, panelRotation: number, unit: IPointData, isFixed: boolean): void {
        const editor = this.editor
        const helpWidth = this.helpNode.boxBounds.width
        const helpHeight = this.helpNode.boxBounds.height

        let worldX: number
        let worldY: number
        let rotation = 0

        if (this.__helpPlacement === 'panel') {
            // 固定在面板外侧（direction 为 top 时在上方，其余在下方）
            const dirX = isFixed ? 0 : unit.x
            const dirY = isFixed ? 1 : unit.y
            const sign = this.__direction === 'top' ? -1 : 1
            const distance = (this.group.height as number) / 2 + this.__helpGap + helpHeight / 2

            worldX = panelX + dirX * sign * distance
            worldY = panelY + dirY * sign * distance
            rotation = panelRotation
        } else {
            // 跟随鼠标：默认在鼠标右下方，贴近画布边缘时翻转到另一侧
            const pointer = this.__pointer
            const offset = this.__helpOffset
            const canvas = editor.leafer && editor.leafer.canvas
            const canvasBounds = canvas && canvas.bounds

            const pointerX = pointer ? pointer.x : panelX
            const pointerY = pointer ? pointer.y : panelY

            let left = pointerX + offset
            let top = pointerY + offset

            if (canvasBounds) {
                if (left + helpWidth > canvasBounds.x + canvasBounds.width) left = pointerX - offset - helpWidth
                if (top + helpHeight > canvasBounds.y + canvasBounds.height) top = pointerY - offset - helpHeight
                if (left < canvasBounds.x) left = canvasBounds.x
                if (top < canvasBounds.y) top = canvasBounds.y
            }

            worldX = left + helpWidth / 2
            worldY = top + helpHeight / 2
        }

        const point = this.__pointerLocal
        editor.worldToInner({ x: worldX, y: worldY }, point)

        if (this.helpNode.x !== point.x) this.helpNode.x = point.x
        if (this.helpNode.y !== point.y) this.helpNode.y = point.y
        if (this.helpNode.rotation !== rotation) this.helpNode.rotation = rotation
    }

    /** 覆盖插件实例的按钮样式，会立即刷新 */
    public setStyle(style: IEditorButtonStyle): this {
        copyStyle(this.__style, style)
        this.refreshStyle()
        return this
    }

    /** 重新应用按钮样式到所有按钮 */
    public refreshStyle(): void {
        for (const button of this.__list) button.applyStyle()
        this.layout()
    }

    /** 覆盖插件实例的整体样式（背景、圆角、内边距等），会立即刷新 */
    public setGroupStyle(style: IEditorButtonsGroupStyle): this {
        copyGroupStyle(this.__groupStyle, style)
        this.applyGroupStyle()
        return this
    }

    /** 应用整体样式到按钮面板（含 hover / press 状态） */
    public applyGroupStyle(): void {
        const style = this.groupStyle
        const hasSurface = !!(style.fill || style.stroke)

        this.__padding = style.padding === undefined
            ? (hasSurface ? [defaultGroupPadding, defaultGroupPadding, defaultGroupPadding, defaultGroupPadding] : [0, 0, 0, 0])
            : (MathHelper.fourNumber(style.padding) || [0, 0, 0, 0])

        const hover = style.hover
        const press = style.press
        const state = this.__pressed && press ? press : (this.__hovered && hover ? hover : undefined)
        const pick = <T>(key: keyof typeof style): T => (state && (state as Record<string, unknown>)[key] !== undefined ? (state as Record<string, unknown>)[key] : (style as Record<string, unknown>)[key]) as T

        setAttrs(this.group, {
            fill: pick('fill'),
            stroke: pick('stroke'),
            strokeWidth: pick('strokeWidth'),
            cornerRadius: pick('cornerRadius'),
            opacity: pick('opacity'),
            shadow: pick('shadow'),
            // 过渡动画（需安装 @leafer-in/animate 才会生效）
            transition: style.transition ?? hover?.transition ?? press?.transition,
        })

        if (this.__ready) this.layout()
    }

    /** 覆盖插件实例的帮助栏样式，会立即刷新 */
    public setHelpStyle(style: IEditorButtonsHelpStyle): this {
        copyHelpStyle(this.__helpStyle, style)
        this.applyHelpStyle()
        return this
    }

    /** 应用帮助栏样式 */
    public applyHelpStyle(): void {
        const style = this.helpStyle

        setAttrs(this.helpNode, {
            fill: style.fill,
            stroke: style.stroke,
            strokeWidth: style.strokeWidth,
            cornerRadius: style.cornerRadius,
            opacity: style.opacity,
            shadow: style.shadow,
        })

        setAttrs(this.helpLabel, {
            fill: style.textColor,
            fontSize: style.fontSize,
            fontFamily: style.fontFamily,
            fontWeight: style.fontWeight,
            padding: style.padding,
        })

        if (this.__ready) this.layout()
    }

    /** 设置按钮组方位，会同步覆盖 app.editor.config.buttonsDirection */
    public setDirection(value: IDirection4): this {
        if (!directionList.includes(value)) return this
        this.__direction = value
        this.syncEditorConfig()
        return this.layout()
    }

    /** 设置按钮组方位是否固定，会同步覆盖 app.editor.config.buttonsFixed */
    public setFixed(value: boolean): this {
        this.__fixed = value
        this.syncEditorConfig()
        return this.layout()
    }

    /** 设置按钮组与编辑框的外边距，会同步覆盖 app.editor.config.buttonsMargin */
    public setMargin(value: number): this {
        this.__margin = value
        this.syncEditorConfig()
        return this.layout()
    }

    /** 销毁插件，移除全部按钮与事件监听 */
    public destroy(): void {
        if (this.__destroyed) return
        this.__destroyed = true

        this.clearHelpTimer()

        const editor = this.editor
        if (editor) {
            this.__eventIds.forEach(id => editor.off_(id))
            const leafer = editor.leafer
            if (leafer && this.__renderEventId) leafer.off_(this.__renderEventId)
            this.removeRenderEvent()
            this.__anchor.destroy()
        }
        this.__eventIds = []
        this.__renderEventId = undefined

        this.clear()
        this.group.remove()
        this.group.destroy()
        this.helpNode.remove()
        this.helpNode.destroy()
    }


    // 上下文

    /** 回调上下文 */
    public getContext(button?: EditorButton): IEditorButtonContext {
        const editor = this.editor
        const list = editor ? editor.list : []
        const count = list.length

        return {
            buttons: this,
            app: this.app,
            editor,
            button: button as EditorButton,
            list,
            target: editor && editor.target,
            count,
            single: count === 1,
            multiple: count > 1,
        }
    }


    // 交互（供 EditorButton 调用）

    /** 按钮悬浮状态变化（内部使用） */
    public onButtonHover(button: EditorButton, hovered: boolean, event?: IPointerEvent): void {
        if (this.__destroyed) return

        if (hovered) {
            this.__helpButton = button
            this.updatePointer(event)
            this.clearHelpTimer()
        } else if (this.__helpButton === button) {
            this.__helpButton = undefined
        }

        this.setGroupHovered(this.__list.some(item => item.hovered) || this.__panelHovered)
        this.layout()
    }

    /** 按钮按下状态变化（内部使用） */
    public onButtonPress(_button: EditorButton, pressed: boolean): void {
        if (this.__destroyed) return
        this.setGroupPressed(pressed || this.__list.some(item => item.pressed))
    }

    /** 按钮被点击（内部使用，用于触摸端短暂显示帮助） */
    public onButtonTap(button: EditorButton, event?: IPointerEvent): void {
        if (this.__destroyed || !this.__helpOnTap || !this.help) return

        this.__helpButton = button
        this.updatePointer(event)
        this.layout()

        this.clearHelpTimer()
        this.__helpTimer = setTimeout(() => {
            this.__helpTimer = undefined
            if (this.__destroyed) return
            if (this.__helpButton === button && !this.__list.some(item => item.hovered)) {
                this.__helpButton = undefined
                this.layout()
            }
        }, this.__helpDuration)
    }

    /** 鼠标移动时让帮助栏跟随（内部使用） */
    protected onPointerMove(event: IPointerEvent): void {
        if (this.__destroyed || !this.__helpShown) return
        if (this.updatePointer(event)) this.place()
    }


    // 内部

    /** 记录鼠标位置，返回是否有变化 */
    protected updatePointer(event?: IPointerEvent): boolean {
        if (!event || event.x === undefined) return false
        const pointer = this.__pointer || (this.__pointer = { x: 0, y: 0 })
        if (pointer.x === event.x && pointer.y === event.y) return false
        pointer.x = event.x
        pointer.y = event.y
        return true
    }

    protected listenGroup(): void {
        const { group } = this
        group.on(PointerEvent.ENTER, this.onGroupEnter)
        group.on(PointerEvent.LEAVE, this.onGroupLeave)
        group.on(PointerEvent.DOWN, this.onGroupDown)
        group.on(PointerEvent.UP, this.onGroupUp)
    }

    protected onGroupEnter = (): void => {
        this.__panelHovered = true
        this.setGroupHovered(true)
    }

    protected onGroupLeave = (): void => {
        this.__panelHovered = false
        this.setGroupHovered(this.__list.some(item => item.hovered))
    }

    protected onGroupDown = (): void => { this.setGroupPressed(true) }

    protected onGroupUp = (): void => { this.setGroupPressed(this.__list.some(item => item.pressed)) }

    protected setGroupHovered(value: boolean): void {
        if (this.__hovered === value) return
        this.__hovered = value
        this.applyGroupStyle()
    }

    protected setGroupPressed(value: boolean): void {
        if (this.__pressed === value) return
        this.__pressed = value
        this.applyGroupStyle()
    }

    protected clearHelpTimer(): void {
        if (this.__helpTimer) {
            clearTimeout(this.__helpTimer)
            this.__helpTimer = undefined
        }
    }

    protected insert(options: IEditorButtonOptions, index?: number): EditorButton {
        const button = new EditorButton(this, options)
        button.id = this.uniqueId(button.id)

        if (index === undefined || index >= this.__list.length) this.__list.push(button)
        else this.__list.splice(Math.max(0, index), 0, button)

        this.group.add(button.node)
        return button
    }

    protected uniqueId(id: string): string {
        if (!this.get(id)) return id
        let index = 2
        while (this.get(`${id}-${index}`)) index++
        return `${id}-${index}`
    }

    /** 没有按钮时把容器从编辑器上移除 */
    protected syncHost(): void {
        if (this.__destroyed) return
        const host = this.host
        if (!host) return

        if (this.__list.length) {
            if (this.group.parent !== host) host.add(this.group)
        } else if (this.group.parent) this.group.remove()

        // 帮助栏挂在按钮面板后面，保证显示在最上层
        if (this.__list.length && this.help) {
            if (this.helpNode.parent !== host) host.add(this.helpNode)
        } else if (this.helpNode.parent) this.helpNode.remove()
    }

    /** 把方位等配置同步给编辑器（旋转控制点等会跟随变化） */
    protected syncEditorConfig(): void {
        const editor = this.editor
        if (!editor) return
        const { config } = editor
        if (config.buttonsDirection !== this.__direction) config.buttonsDirection = this.__direction
        if (!!config.buttonsFixed !== this.__fixed) config.buttonsFixed = this.__fixed
        if (config.buttonsMargin !== this.__margin) config.buttonsMargin = this.__margin
    }

    /** 编辑框状态是否发生变化（用于渲染前自动跟随） */
    protected isStateChanged(): boolean {
        const editor = this.editor
        if (!editor) return false

        const { editBox } = editor
        const rect = editBox && editBox.rect
        if (!rect) return false

        const values: (number | boolean)[] = [
            editBox.x, editBox.y, editBox.rotation, editBox.scaleX, editBox.scaleY, editBox.skewX, editBox.skewY,
            rect.width, rect.height,
            editBox.visible,
            editor.buttons.visible,
        ]

        const state = this.__state
        let changed = false
        for (let i = 0; i < values.length; i++) {
            if (state[i] !== values[i]) {
                state[i] = values[i]
                changed = true
            }
        }
        return changed
    }

    protected onEditorChange(): void { this.update() }

    protected onRenderStart(): void {
        if (this.__destroyed) return

        // 保证编辑框已更新（编辑器自身在渲染前更新，这里做一次兜底）
        const editor = this.editor
        if (editor && editor.editing && editor.editTool) editor.update()

        if (this.isStateChanged()) this.layout()
    }

    protected onRenderEnd(): void {
        this.removeRenderEvent()
        this.update()
    }

    protected waitRender(): void {
        if (this.__waitEventId || this.__waitTimes > maxWaitRenderTimes) return
        const leafer = this.editor && this.editor.leafer
        if (!leafer) return

        this.__waitTimes++
        this.__waitEventId = leafer.on_(RenderEvent.END, this.onRenderEnd, this)
    }

    protected removeRenderEvent(): void {
        const id = this.__waitEventId
        if (!id) return
        this.__waitEventId = undefined
        const leafer = this.editor && this.editor.leafer
        if (leafer) leafer.off_(id)
    }

}
