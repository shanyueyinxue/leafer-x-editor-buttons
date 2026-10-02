import { describe, expect, test, vi } from 'vitest'

import { Group, Platform } from '@leafer-ui/core'

import type { IApp } from '@leafer-ui/interface'

import {
    copyGroupStyle,
    copyHelpStyle,
    copyStyle,
    defaultGroupStyle,
    defaultHelpStyle,
    defaultStyle,
    EditorButton,
    EditorButtons,
    formatShowType,
    matchShowType,
    mergeGroupStyle,
    mergeHelpStyle,
    mergeStyle,
} from '../src'


// 单元测试运行在 node 环境下，没有画布与渲染器。
// 这里用空实现替换布局入口，只验证插件逻辑（按钮位置由浏览器 demo 验证）。
Platform.layout = () => { }


function createApp(list: unknown[] = []) {
    const editor = new Group() as unknown as Record<string, unknown>
    const buttons = new Group() // 编辑器自带的按钮组（插件会放一个占位元素进去）
    const events: Record<string, (event?: unknown) => void> = {}

    buttons.visible = true

    // 模拟一个选中范围（未旋转，世界坐标 100,200 尺寸 200x100）
    const selection = { x: 100, y: 200, width: 200, height: 100 }
    const rect = {
        width: selection.width,
        height: selection.height,
        worldBoxBounds: { ...selection },
        getWorldPoint: (point: { x: number; y: number }) => ({ x: selection.x + point.x, y: selection.y + point.y }),
    }

    Object.assign(editor, {
        buttons,
        config: {} as Record<string, unknown>,
        list,
        target: list,
        editBox: { visible: true, rect },
        on_(type: string, listener: () => void, bind?: unknown) {
            events[type] = bind ? (listener as () => void).bind(bind) : listener
            return { type }
        },
        off_() { },
    })

    return {
        app: { editor } as unknown as IApp,
        editor,
        buttons,
        rect,
        /** 模拟选中元素变化 */
        select(value: unknown[]) {
            editor.list = editor.target = value
            ;(editor.editBox as { visible: boolean }).visible = value.length > 0 // 编辑器在没有选中元素时会隐藏编辑框
            if (events['editor.select']) events['editor.select']()
        },
        /** 模拟鼠标移动（坐标与 Leafer 事件一致，为画布坐标系） */
        move(x: number, y: number) {
            if (events['pointer.move']) events['pointer.move']({ x, y })
        },
    }
}


describe('showType', () => {

    test('matchShowType: 单选 / 多选 / 所有情况', () => {
        expect(matchShowType('single', 0)).toBe(false)
        expect(matchShowType('single', 1)).toBe(true)
        expect(matchShowType('single', 2)).toBe(false)

        expect(matchShowType('multiple', 0)).toBe(false)
        expect(matchShowType('multiple', 1)).toBe(false)
        expect(matchShowType('multiple', 2)).toBe(true)

        expect(matchShowType('all', 0)).toBe(true)
        expect(matchShowType('all', 1)).toBe(true)
        expect(matchShowType('all', 9)).toBe(true)

        // 数组: 满足其中之一即可
        expect(matchShowType(['single', 'multiple'], 1)).toBe(true)
        expect(matchShowType(['single', 'multiple'], 3)).toBe(true)
        expect(matchShowType(['single', 'multiple'], 0)).toBe(false)
    })

    test('formatShowType: 默认值 all', () => {
        expect(formatShowType(undefined)).toEqual(['all'])
        expect(formatShowType('single')).toEqual(['single'])
        expect(formatShowType(['single', 'all'])).toEqual(['single', 'all'])
    })

})


describe('style', () => {

    test('mergeStyle: 忽略 undefined，hover / press 浅合并', () => {
        const style = mergeStyle(
            { fill: '#000', cornerRadius: 10, hover: { fill: '#111' } },
            { fill: undefined, fontSize: 12, hover: { fill: '#222' } },
        )

        expect(style.fill).toBe('#000')
        expect(style.cornerRadius).toBe(10)
        expect(style.fontSize).toBe(12)
        expect(style.hover.fill).toBe('#222')
    })

    test('copyStyle: 就地合并', () => {
        const style = mergeStyle(defaultStyle)
        copyStyle(style, { fill: '#FF0000', hover: { textColor: '#00FF00' } })

        expect(style.fill).toBe('#FF0000')
        expect(style.hover.fill).toBe(defaultStyle.hover.fill)
        expect(style.hover.textColor).toBe('#00FF00')
    })

})


describe('editor-buttons', () => {

    test('没有 app.editor 时抛出提示', () => {
        expect(() => new EditorButtons({} as never)).toThrow()
    })

    test('添加 / 查找 / 移除按钮', () => {
        const { app, editor, buttons: editorButtons } = createApp()
        const buttons = new EditorButtons(app)

        expect(buttons.size).toBe(0)
        expect(buttons.group.parent).toBeFalsy() // 没有按钮时不挂载到编辑器
        expect(editorButtons.children.length).toBe(1) // 编辑器按钮组里有占位元素

        const button = buttons.add({ id: 'remove', text: '移除' })

        expect(button).toBeInstanceOf(EditorButton)
        expect(buttons.size).toBe(1)
        expect(buttons.get('remove')).toBe(button)
        expect(buttons.has('remove')).toBe(true)
        expect(buttons.indexOf(button)).toBe(0)
        expect(buttons.group.parent).toBe(editor)
        expect(buttons.host).toBe(editor)
        expect(button.text).toBe('移除')
        expect(button.node.parent).toBe(buttons.group)

        expect(buttons.remove('remove')).toBe(true)
        expect(buttons.size).toBe(0)
        expect(buttons.remove('remove')).toBe(false)
        expect(buttons.group.parent).toBeFalsy()
    })

    test('批量添加、id 去重、索引插入、清空', () => {
        const { app } = createApp()
        const buttons = new EditorButtons(app)

        const list = buttons.add([{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }])
        expect(list.length).toBe(2)
        expect(buttons.size).toBe(2)

        buttons.add({ id: 'a', text: 'A2' })
        expect(buttons.list[2].id).toBe('a-2')
        expect(buttons.get('a').text).toBe('A')

        buttons.add({ id: 'c', text: 'C' }, 0)
        expect(buttons.list[0].id).toBe('c')

        buttons.clear()
        expect(buttons.size).toBe(0)
        expect(list[0].destroyed).toBe(true) // 清空时按钮已销毁
    })

    test('单选 / 多选 / 所有情况 的显示切换', () => {
        const { app, select } = createApp()
        const buttons = new EditorButtons(app)

        const single = buttons.add({ id: 'single', text: '单选', showType: 'single' })
        const multiple = buttons.add({ id: 'multiple', text: '多选', showType: 'multiple' })
        const all = buttons.add({ id: 'all', text: '所有', showType: 'all' })

        select([])
        expect([single.visible, multiple.visible, all.visible]).toEqual([false, false, true])

        select([{}])
        expect([single.visible, multiple.visible, all.visible]).toEqual([true, false, true])

        select([{}, {}])
        expect([single.visible, multiple.visible, all.visible]).toEqual([false, true, true])

        select([{}, {}, {}])
        expect([single.visible, multiple.visible, all.visible]).toEqual([false, true, true])

        // 显示状态同步到元素（0 = display: none，不占用布局空间）
        expect(single.node.visible).toBe(0)
        expect(all.node.visible).toBe(true)
    })

    test('text 默认文字与 getText 回调', () => {
        const { app, select } = createApp()
        const buttons = new EditorButtons(app)

        const button = buttons.add({
            id: 'dynamic',
            text: '全选', // 默认文字
            getText: ({ count }) => (count > 1 ? `已选 ${count} 个` : ''), // 返回空字符串时回到默认文字
            show: ({ count }) => count !== 3,
            showType: 'all',
        })

        select([{}, {}])
        expect(button.visible).toBe(true)
        expect(button.text).toBe('已选 2 个')

        select([{}, {}, {}]) // show 返回 false 隐藏
        expect(button.visible).toBe(false)
        expect(button.text).toBe('已选 3 个')

        select([{}]) // getText 返回空字符串 -> 回到默认文字
        expect(button.visible).toBe(true)
        expect(button.text).toBe('全选')
        expect(button.textNode.text).toBe('全选')

        // 默认文字可以是空字符串（完全不显示文字）
        button.set({ text: '' })
        select([{}, {}])
        expect(button.text).toBe('已选 2 个')

        select([{}])
        expect(button.text).toBe('')
        expect(button.textNode.text).toBe('')

        // setText 修改的是默认文字，下次刷新依然生效
        button.setText('重新命名')
        select([{}])
        expect(button.text).toBe('重新命名')

        // 纯静态按钮
        const simple = buttons.add({ id: 'simple', text: '静态' })
        select([{}, {}])
        expect(simple.text).toBe('静态')

        // 静态 visible 开关优先级最高
        button.set({ visible: false })
        expect(button.visible).toBe(false)
    })

    test('帮助栏：悬浮显示、离开隐藏', () => {
        const { app, select } = createApp()
        const buttons = new EditorButtons(app, { helpText: '默认提示' })

        const copy = buttons.add({ id: 'copy', text: '复制', help: '复制元素' })
        const other = buttons.add({ id: 'other', text: '其它' })

        select([{}])

        // 没有悬浮 -> 隐藏
        expect(buttons.help).toBe(true) // 有按钮设置了 help，自动启用
        expect(buttons.helpNode.visible).toBe(0)
        expect(buttons.helpNode.parent).toBe(buttons.editor) // 与面板同级，保证显示在最上层

        // 悬浮有 help 的按钮
        copy.node.emit('pointer.enter')
        expect(copy.hovered).toBe(true)
        expect(buttons.helpButton).toBe(copy)
        expect(buttons.getHelpText()).toBe('复制元素')
        expect(buttons.helpShown).toBe(true)
        expect(buttons.helpNode.visible).toBe(true)
        expect(buttons.helpLabel.text).toBe('复制元素')

        // 移开 -> 隐藏
        copy.node.emit('pointer.leave')
        expect(copy.hovered).toBe(false)
        expect(buttons.helpButton).toBeUndefined()
        expect(buttons.helpShown).toBe(false)
        expect(buttons.helpNode.visible).toBe(0)

        // 悬浮没有 help 的按钮 -> 显示默认提示
        other.node.emit('pointer.enter')
        expect(buttons.getHelpText()).toBe('默认提示')
        expect(buttons.helpNode.visible).toBe(true)

        // 动态帮助
        other.set({ getHelp: ({ count }) => `当前选中 ${count} 个` })
        buttons.layout()
        expect(buttons.getHelpText()).toBe('当前选中 1 个')

        select([{}, {}])
        expect(buttons.getHelpText()).toBe('当前选中 2 个')

        // 关闭帮助栏
        buttons.help = false
        expect(buttons.helpShown).toBe(false)
        expect(buttons.helpNode.visible).toBe(0)
        expect(buttons.help).toBe(false)
        expect(buttons.helpNode.parent).toBeFalsy() // 关闭后不再挂载
    })

    test('帮助栏：跟随鼠标（node 环境尺寸为 0，直接校验坐标）', () => {
        const { app, select, move } = createApp()
        const buttons = new EditorButtons(app, { helpOffset: 14 })

        const button = buttons.add({ id: 'a', text: 'A', help: '帮助文字' })
        select([{}])

        // 悬浮时先用事件坐标定位
        button.node.emit('pointer.enter', { x: 300, y: 400 })
        expect(buttons.helpShown).toBe(true)
        expect(buttons.helpNode.x).toBe(314)
        expect(buttons.helpNode.y).toBe(414)

        // 鼠标移动 -> 跟随
        move(500, 260)
        expect(buttons.helpNode.x).toBe(514)
        expect(buttons.helpNode.y).toBe(274)

        // 移开按钮 -> 隐藏，鼠标移动不再更新
        button.node.emit('pointer.leave')
        expect(buttons.helpNode.visible).toBe(0)
        move(10, 10)
        expect(buttons.helpNode.x).toBe(514)

        // 固定在面板外侧的模式
        const fixedHelp = new EditorButtons(app, { helpPlacement: 'panel', helpGap: 6, helpText: '提示' })
        const other = fixedHelp.add({ id: 'b', text: 'B' })
        other.node.emit('pointer.enter', { x: 300, y: 400 })
        // 面板高度为 0（node 环境），所以提示框中心在面板下方 6px 处
        expect(fixedHelp.helpNode.y).toBe(fixedHelp.group.y + 6)
        expect(fixedHelp.helpNode.x).toBe(fixedHelp.group.x)
    })

    test('竖排：left / right 方位按钮竖向排列', () => {
        const { app, select } = createApp()
        const buttons = new EditorButtons(app, { gap: 8 })

        const one = buttons.add({ id: 'one', text: 'A' })
        const two = buttons.add({ id: 'two', text: 'B' })
        const three = buttons.add({ id: 'three', text: 'C' })
        select([{}])

        // 默认 bottom -> 横排（node 环境按钮尺寸为 0，间距 8）
        expect(buttons.vertical).toBe(false)
        expect([one.node.x, two.node.x, three.node.x]).toEqual([0, 8, 16])
        expect([one.node.y, two.node.y, three.node.y]).toEqual([0, 0, 0])

        // right -> 自动竖排
        buttons.direction = 'right'
        expect(buttons.vertical).toBe(true)
        expect([one.node.x, two.node.x, three.node.x]).toEqual([0, 0, 0])
        expect([one.node.y, two.node.y, three.node.y]).toEqual([0, 8, 16])

        // top 回到横排
        buttons.direction = 'top'
        expect(buttons.vertical).toBe(false)
        expect(two.node.x).toBe(8)

        // 手动覆盖
        buttons.vertical = true
        expect(two.node.y).toBe(8)
        buttons.vertical = false
        expect(two.node.x).toBe(8)
    })

    test('面板定位：贴在选中范围外侧', () => {
        const { app, select } = createApp()
        const buttons = new EditorButtons(app, { margin: 12, fixed: true })

        buttons.add({ id: 'a', text: 'A' })
        select([{}])

        // 选中范围 100,200 200x100；面板尺寸为 0，所以中心在底边外 12px 处
        expect(buttons.group.x).toBe(200)
        expect(buttons.group.y).toBe(312)

        buttons.direction = 'top'
        expect(buttons.group.y).toBe(188)

        buttons.direction = 'left'
        expect(buttons.group.x).toBe(88)
        expect(buttons.group.y).toBe(250)

        buttons.direction = 'right'
        expect(buttons.group.x).toBe(312)

        buttons.margin = 20
        expect(buttons.group.x).toBe(320)

        // 取消选中 -> 面板与帮助栏都隐藏
        select([])
        expect(buttons.group.visible).toBe(0)
        expect(buttons.helpNode.visible).toBe(0)
    })

    test('帮助栏：触摸端点击后短暂显示', () => {
        vi.useFakeTimers()

        const { app, select } = createApp()
        const buttons = new EditorButtons(app, { helpOnTap: true, helpDuration: 500 })
        const button = buttons.add({ id: 'tap', text: '按钮', help: '帮助文字' })

        select([{}])
        expect(buttons.helpNode.visible).toBe(0)

        button.node.emit('tap')
        expect(buttons.getHelpText()).toBe('帮助文字')
        expect(buttons.helpNode.visible).toBe(true)

        vi.advanceTimersByTime(600)
        expect(buttons.helpNode.visible).toBe(0)

        vi.useRealTimers()
    })

    test('整体样式 hover / press 状态', () => {
        const { app } = createApp()
        const buttons = new EditorButtons(app, {
            groupStyle: {
                fill: '#FFFFFF',
                stroke: '#DDDDDD',
                hover: { fill: '#F7F9FF', stroke: '#A9C0FF' },
                press: { fill: '#EEF3FF' },
            },
        })

        const button = buttons.add({ id: 'a', text: 'A' })

        expect(buttons.group.fill).toBe('#FFFFFF')
        expect(buttons.group.stroke).toBe('#DDDDDD')

        // 悬浮按钮 -> 面板进入 hover 状态
        button.node.emit('pointer.enter')
        expect(buttons.group.fill).toBe('#F7F9FF')
        expect(buttons.group.stroke).toBe('#A9C0FF')

        // 按下 -> 进入 press 状态
        button.node.emit('pointer.down')
        expect(buttons.group.fill).toBe('#EEF3FF')

        button.node.emit('pointer.up')
        expect(buttons.group.fill).toBe('#F7F9FF')

        // 离开 -> 回到基础样式
        button.node.emit('pointer.leave')
        expect(buttons.group.fill).toBe('#FFFFFF')
        expect(buttons.group.stroke).toBe('#DDDDDD')

        // 面板自身的悬浮（面板有背景时可命中）也生效
        buttons.group.emit('pointer.enter')
        expect(buttons.group.fill).toBe('#F7F9FF')
        buttons.group.emit('pointer.leave')
        expect(buttons.group.fill).toBe('#FFFFFF')
    })

    test('帮助栏样式', () => {
        const { app } = createApp()
        const buttons = new EditorButtons(app)

        expect(buttons.helpStyle.fill).toBe(defaultHelpStyle.fill)

        buttons.setHelpStyle({ fill: '#111827', textColor: '#FFE58F', fontSize: 13, padding: [2, 6] })
        expect(buttons.helpStyle.fill).toBe('#111827')
        expect(buttons.helpNode.fill).toBe('#111827')
        expect(buttons.helpLabel.fill).toBe('#FFE58F')
        expect(buttons.helpLabel.fontSize).toBe(13)

        buttons.helpStyle = {} // 回到默认样式
        expect(buttons.helpStyle.fill).toBe(defaultHelpStyle.fill)
        expect(buttons.helpNode.fill).toBe(defaultHelpStyle.fill)

        expect(mergeHelpStyle(defaultHelpStyle, { fontSize: 10 }).fontSize).toBe(10)
        expect(copyHelpStyle({}, { fill: undefined, opacity: 0.5 }).opacity).toBe(0.5)
    })

    test('click 回调与上下文', () => {
        const { app, select } = createApp()
        const buttons = new EditorButtons(app)

        let result: { count: number; id: string; hasEvent: boolean } | undefined

        const button = buttons.add({
            id: 'click',
            text: '点击',
            onclick: (event, context) => {
                result = { count: context.count, id: context.button.id, hasEvent: !!event }
            },
        })

        select([{}, {}])
        button.node.emit('tap')

        expect(result.count).toBe(2)
        expect(result.id).toBe('click')
        expect(result.hasEvent).toBe(true)
        expect(buttons.getContext().count).toBe(2)
    })

    test('样式：默认样式 / 实例样式 / 按钮样式 逐层覆盖', () => {
        const { app } = createApp()
        const buttons = new EditorButtons(app, { style: { fill: '#000000' } })

        expect(buttons.style.fill).toBe('#000000')
        expect(buttons.style.cornerRadius).toBe(defaultStyle.cornerRadius)

        buttons.setStyle({ cornerRadius: 4 })
        expect(buttons.style.fill).toBe('#000000')
        expect(buttons.style.cornerRadius).toBe(4)

        const button = buttons.add({ id: 'style', text: '样式', style: { fill: '#FFFFFF', hover: { fill: '#EEEEEE' } } })

        expect(button.style.fill).toBe('#FFFFFF')
        expect(button.style.cornerRadius).toBe(4)
        expect(button.style.hover.fill).toBe('#EEEEEE')

        // 样式会应用到元素上
        expect(button.node.fill).toBe('#FFFFFF')
        expect(button.node.cornerRadius).toBe(4)
        expect(button.textNode.fill).toBe(defaultStyle.textColor)
        expect(button.textNode.padding).toEqual(defaultStyle.padding)

        // 整体覆盖插件实例样式
        buttons.style = { fill: '#123456' }
        expect(buttons.style.fill).toBe('#123456')
        expect(buttons.get('style').style.fill).toBe('#FFFFFF') // 按钮样式仍然优先

        buttons.remove('style')
        expect(buttons.style.fill).toBe('#123456')
    })

    test('整体样式：背景 / 圆角 / 内边距', () => {
        const { app } = createApp()
        const buttons = new EditorButtons(app)

        // 默认没有背景，也没有内边距
        expect(buttons.groupStyle.fill).toBeUndefined()
        buttons.add({ id: 'a', text: 'A' })

        // node 环境测不到文字宽度，下面只验证内边距带来的尺寸
        expect(buttons.group.width).toBe(0)
        expect(buttons.group.height).toBe(0)
        expect(buttons.get('a').node.x).toBe(0)

        // 设置背景后，会自动带上默认内边距 4
        buttons.setGroupStyle({ fill: '#FFFFFF', cornerRadius: 12, stroke: '#DDDDDD', strokeWidth: 1 })
        expect(buttons.group.fill).toBe('#FFFFFF')
        expect(buttons.group.cornerRadius).toBe(12)
        expect(buttons.group.stroke).toBe('#DDDDDD')
        expect(buttons.group.width).toBe(8)
        expect(buttons.group.height).toBe(8)
        expect(buttons.get('a').node.x).toBe(4)

        // 自定义内边距 [上, 右, 下, 左]
        buttons.setGroupStyle({ padding: [2, 6, 4, 8] })
        expect(buttons.group.width).toBe(14)
        expect(buttons.group.height).toBe(6)
        expect(buttons.get('a').node.x).toBe(8) // 左内边距
        expect(buttons.get('a').node.y).toBe(2) // 上内边距

        // 整体覆盖，可以移除背景
        buttons.groupStyle = { fill: '#000000' }
        expect(buttons.groupStyle.fill).toBe('#000000')
        expect(buttons.groupStyle.cornerRadius).toBeUndefined()
        expect(buttons.group.cornerRadius).toBe(0)
        expect(buttons.group.shadow).toBeUndefined()

        buttons.groupStyle = {}
        expect(buttons.group.fill).toBeUndefined() // 背景已移除
        expect(buttons.group.width).toBe(0) // 内边距也回到 0

        expect(mergeGroupStyle(defaultGroupStyle, { padding: 3 }).padding).toBe(3)
        expect(copyGroupStyle({}, { stroke: undefined, opacity: 0 }).opacity).toBe(0)
    })

    test('方位 / 固定 / 边距 覆盖编辑器配置', () => {
        const { app, editor } = createApp()
        const config = editor.config as Record<string, unknown>

        const buttons = new EditorButtons(app, { direction: 'top', fixed: true, margin: 20 })

        expect(buttons.direction).toBe('top')
        expect(buttons.fixed).toBe(true)
        expect(buttons.margin).toBe(20)

        // 同步覆盖 app.editor
        expect(config.buttonsDirection).toBe('top')
        expect(config.buttonsFixed).toBe(true)
        expect(config.buttonsMargin).toBe(20)

        // 运行中修改同样生效
        buttons.direction = 'left'
        buttons.fixed = false
        buttons.margin = 8

        expect(buttons.direction).toBe('left')
        expect(buttons.fixed).toBe(false)
        expect(buttons.margin).toBe(8)
        expect(config.buttonsDirection).toBe('left')
        expect(config.buttonsFixed).toBe(false)
        expect(config.buttonsMargin).toBe(8)

        // 非法方位忽略
        buttons.direction = 'xxx' as never
        expect(buttons.direction).toBe('left')
    })

    test('不传方位等参数时沿用编辑器配置', () => {
        const { app, editor } = createApp()
        const config = editor.config as Record<string, unknown>
        config.buttonsDirection = 'right'
        config.buttonsFixed = true
        config.buttonsMargin = 30

        const buttons = new EditorButtons(app)

        expect(buttons.direction).toBe('right')
        expect(buttons.fixed).toBe(true)
        expect(buttons.margin).toBe(30)
    })

    test('间距与销毁', () => {
        const { app } = createApp()
        const buttons = new EditorButtons(app, { gap: 12 })

        expect(buttons.gap).toBe(12)
        buttons.gap = 6
        expect(buttons.gap).toBe(6)

        buttons.add({ id: 'a', text: 'A' })
        const button = buttons.get('a')

        buttons.destroy()

        expect(buttons.destroyed).toBe(true)
        expect(buttons.size).toBe(0)
        expect(button.destroyed).toBe(true)
        expect(buttons.group.parent).toBeFalsy()
    })

})
