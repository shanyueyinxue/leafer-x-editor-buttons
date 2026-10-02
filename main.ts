import { App, Rect, Text } from 'leafer-ui'
import '@leafer-in/editor' // 导入图形编辑器插件
import '@leafer-in/viewport' // 导入视口插件 (可选)

import { EditorButtons } from './src'


const app = new App({
    view: window,
    fill: '#F2F5FA',
    editor: {
        middlePoint: { pointType: 'resize-rotate' },
        circle: {},
    },
})

const colors = ['#32CD79', '#3D7EFF', '#FEB027']

const rects = colors.map((fill, index) => {
    const rect = Rect.one({ editable: true, fill }, 180 + index * 190, 260, 140, 100)
    app.tree.add(rect)
    return rect
})

app.tree.add(new Text({
    text: '点击 / 框选元素，试试编辑框底部的自定义按钮（可旋转元素、悬浮按钮看帮助）',
    x: 40,
    y: 60,
    fill: '#8A94A6',
    fontSize: 14,
    editable: false,
}))


// 创建插件实例
const buttons = new EditorButtons(app, {
    gap: 8,
    fixed: true, // 按钮不随元素旋转（也可写在 app.editor.config.buttonsFixed 里）
    direction: 'bottom', // 方位: bottom / top / left / right
    margin: 12, // 与编辑框的外边距
    style: { cornerRadius: 8, fontSize: 12, padding: [7, 12] }, // 按钮样式
    groupStyle: { // 整体样式: 让一排按钮看起来是一块整体
        fill: '#FFFFFF',
        cornerRadius: 12,
        stroke: '#DCE3EE',
        strokeWidth: 1,
        padding: [5, 6], // 上 右 下 左（有背景时默认为 4）
        shadow: { x: 0, y: 2, blur: 8, color: '#1F2A441F' },
        hover: { stroke: '#A9C0FF' }, // 鼠标移到按钮或面板上时
        transition: 0.12, // 状态过渡动画，需安装 @leafer-in/animate
    },
    help: true, // 启用帮助栏（不写也会在有按钮设置 help 时自动启用）
    helpText: '点击按钮执行操作', // 未单独设置 help 的按钮显示这句
    helpStyle: { fill: '#1F2A44', cornerRadius: 6, padding: [4, 8], textColor: '#FFFFFF', fontSize: 11 },
    helpPlacement: 'mouse', // mouse: 跟随鼠标（默认） / panel: 固定在面板外侧
    helpOffset: 14, // 跟随鼠标时的偏移
    // vertical: true, // 按钮是否竖排（不写时 left / right 方位自动竖排）
})


// 单选：只选中一个元素时显示
buttons.add({
    id: 'clone',
    text: '复制',
    help: '复制选中的元素，并偏移一点位置',
    showType: 'single',
    show: ({ list }) => list.every(item => !item.locked), // 可选，返回 true 显示
    onclick: (_, { list, app }) => {
        const source = list[0]
        if (!source) return

        const data = source.toJSON() as Record<string, unknown>
        data.x = (source.x as number) + 24
        data.y = (source.y as number) + 24

        app.tree.add(data as never)
        app.editor.select(app.tree.children[app.tree.children.length - 1])
    },
})


// 多选：选中多个元素时显示
buttons.add({
    id: 'remove',
    text: '移除选中',
    getHelp: ({ count }) => `移除当前选中的 ${count} 个元素`, // 动态帮助
    showType: 'multiple',
    style: { fill: '#FF5B5B', hover: { fill: '#FF7878' }, press: { fill: '#E64A4A' } },
    onclick: (_, { list, editor }) => {
        list.forEach(item => item.remove())
        editor.target = null // 取消选择
    },
})


// 所有情况：text 默认文字 + getText 动态文字（返回空字符串时回到默认文字）
buttons.add({
    id: 'selectAll',
    text: '全选',
    getText: ({ count }) => (count > 1 ? `已选 ${count} 个` : ''),
    help: '选中画布中的全部元素',
    showType: 'all',
    style: {
        fill: '#F1F5FF',
        textColor: '#1F2A44',
        hover: { fill: '#E4EBFF' },
    },
    onclick: (_, { app, editor }) => {
        editor.select(app.tree.children.filter(item => item.editable))
    },
})


// 用代码控制按钮：按 id 取到按钮后单独修改样式
buttons.add({ id: 'custom', text: '自定义样式', showType: 'all', onclick: () => { } })
buttons.get('custom').setStyle({ fill: '#8B5CF6', hover: { fill: '#A78BFA' }, textColor: '#FFFFFF' })
buttons.get('custom').set({ help: '单独设置的按钮样式，也可以随时 set() 修改' })

// 也可以修改整体样式 / 帮助栏 / 方位
// buttons.setGroupStyle({ cornerRadius: 6 })
// buttons.setHelpStyle({ fill: '#111827', fontSize: 12 })
// buttons.help = false
// buttons.direction = 'right' // left / right 方位时按钮自动竖排
// buttons.vertical = false // 也可以强制横排
// buttons.gap = 12

// 全局默认样式，影响之后创建的插件实例
// EditorButtons.defaultStyle.fill = '#3D7EFF'
// EditorButtons.defaultGroupStyle.cornerRadius = 12
// EditorButtons.defaultHelpStyle.fill = '#1F2A44'


app.editor.select(rects[0]) // 默认选中一个元素，方便查看按钮


console.log({
    buttons: buttons.list.map(button => button.id),
    size: buttons.size,
    direction: buttons.direction,
    fixed: buttons.fixed,
    help: buttons.help,
    gap: buttons.gap,
})
