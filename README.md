# leafer-x-editor-buttons

[![npm](https://img.shields.io/badge/npm-leafer--x--editor--buttons-blue)](https://www.npmjs.com/package/leafer-x-editor-buttons)


图形编辑器**底部按钮组**插件。

把自定义按钮固定在编辑框底部（可切换任意方位），支持 **单选 / 多选 / 所有情况** 三种显示条件，以及 `onclick`、`show`、`text` / `getText`、`help` / `getHelp` 回调与完整的样式定制；元素旋转、翻转后位置依然准确。

```ts
import { App, Rect } from 'leafer-ui'
import '@leafer-in/editor'
import { EditorButtons } from 'leafer-x-editor-buttons'

const app = new App({ view: window, editor: {} })
app.tree.add(Rect.one({ editable: true, fill: '#32CD79' }, 100, 100))

const buttons = new EditorButtons(app)

buttons.add({
    text: '移除',
    help: '移除选中的元素', // 悬浮时显示在按钮面板外侧的帮助栏里
    showType: 'multiple', // 只在多选时显示
    onclick: (e, { list, editor }) => {
        list.forEach(item => item.remove())
        editor.target = null
    },
})
```

## 特性

- **只依赖 `@leafer-ui/core` / `@leafer-ui/interface` 核心包**，横向排列与定位均由插件自己实现，不依赖 `@leafer-in/flow`
- `new EditorButtons(app, options)` 创建实例，提供 `add` / `remove` / `get` / `clear` / `update` / `setStyle` / `setGroupStyle` / `destroy` 等操作方法
- 显示条件：`single`（单选）、`multiple`（多选）、`all`（所有情况）
- 回调：`onclick(e, context)`、`show(context) => boolean`（可选）、`text(context) => string`（可选）
- **位置由插件计算**：元素旋转、翻转、任意角度后按钮位置依然准确；`direction` / `fixed` / `margin` 可直接覆盖 `app.editor` 上的对应配置
- 样式三层覆盖：`EditorButtons.defaultStyle` → 插件实例 `style` / `setStyle` → 单个按钮 `style`，内置 `hover` / `press`
- **整体样式 `groupStyle`**：给整排按钮加背景、圆角、描边、阴影与内边距，看起来是一块整体，并支持 `hover` / `press` / `transition`
- **帮助栏**：鼠标悬浮到按钮上时跟随鼠标显示该按钮的帮助信息（`help` / `getHelp`），触摸端可选点击时短暂显示
- `direction` 为 `left` / `right` 时按钮自动竖向排列，避免面板横向伸出太远
- 选中元素变化、元素被移动 / 旋转 / 缩放时自动跟随刷新

## 安装

```sh
npm i leafer-x-editor-buttons
```

插件需要图形编辑器支持，请确保项目已安装并启用 `@leafer-in/editor`（或使用 `leafer-editor` / `leafer` 全量包）。

```ts
import { App } from 'leafer-ui'
import '@leafer-in/editor' // 必需，且在 leafer-ui 之后导入
```

## 快速开始

```ts
import { App, Rect } from 'leafer-ui'
import '@leafer-in/editor'
import '@leafer-in/viewport'
import { EditorButtons } from 'leafer-x-editor-buttons'

const app = new App({
    view: window,
    editor: { middlePoint: { pointType: 'resize-rotate' }, circle: {} },
})

app.tree.add(Rect.one({ editable: true, fill: '#32CD79' }, 100, 100))
app.tree.add(Rect.one({ editable: true, fill: '#3D7EFF' }, 100, 300))

const buttons = new EditorButtons(app, {
    gap: 8, // 按钮间距
    fixed: true, // 按钮不随元素旋转（也可写在 app.editor.config.buttonsFixed 里）
    direction: 'bottom', // 方位: bottom / top / left / right
    margin: 12, // 与编辑框的外边距
    style: { cornerRadius: 8, fontSize: 12, padding: [7, 12] }, // 按钮样式
    groupStyle: { // 整体样式: 让一排按钮看起来是一块整体
        fill: '#FFFFFF',
        cornerRadius: 12,
        stroke: '#DCE3EE',
        strokeWidth: 1,
        padding: [5, 6], // 上 右 下 左（未设置且存在背景时默认 4）
        shadow: { x: 0, y: 2, blur: 8, color: '#1F2A441F' },
        hover: { stroke: '#A9C0FF' }, // 悬浮在按钮或面板上时
        // transition: 0.12, // 状态过渡，需安装 @leafer-in/animate
    },
    helpText: '点击按钮执行操作', // 帮助栏默认文案
})

// 单选：复制元素
buttons.add({
    id: 'clone',
    text: '复制',
    help: '复制选中的元素，并偏移一点位置',
    showType: 'single',
    onclick: (e, { list, app }) => {
        const source = list[0]
        const data = source.toJSON()
        data.x = source.x + 24
        data.y = source.y + 24
        app.tree.add(data)
    },
})

// 多选：移除选中元素
buttons.add({
    id: 'remove',
    text: '移除选中',
    getHelp: ({ count }) => `移除当前选中的 ${count} 个元素`, // 动态帮助
    showType: 'multiple',
    style: { fill: '#FF5B5B', hover: { fill: '#FF7878' }, press: { fill: '#E64A4A' } },
    onclick: (e, { list, editor }) => {
        list.forEach(item => item.remove())
        editor.target = null
    },
})

// 所有情况：默认文字 + 动态文字（返回空字符串时回到默认文字）
buttons.add({
    id: 'count',
    text: '全选',
    getText: ({ count }) => (count > 1 ? `已选 ${count} 个` : ''),
    showType: 'all',
    onclick: (e, { app, editor }) => editor.select(app.tree.children),
})
```

在线调试：`npm run start` 后会启动 `http://localhost:12121`，仓库内 `main.ts` 即为示例 demo。

## API

### new EditorButtons(app, options?)

| 参数      | 类型                    | 说明                                                                 |
| --------- | ----------------------- | -------------------------------------------------------------------- |
| `app`     | `IApp`                  | App 实例，插件会从中读取 `app.editor`                                |
| `options` | `IEditorButtonsOptions` | 可选项，见下表                                                       |

#### IEditorButtonsOptions

| 属性         | 类型                     | 默认值                          | 说明                                                                     |
| ------------ | ------------------------ | ------------------------------- | ------------------------------------------------------------------------ |
| `buttons`    | `IEditorButtonOptions[]` | -                               | 初始按钮列表，等同创建后调用 `add(list)`                                 |
| `gap`        | `number`                 | `8`                             | 按钮之间的间距                                                           |
| `style`      | `IEditorButtonStyle`     | -                               | 覆盖插件默认的按钮样式（合并，不影响 `EditorButtons.defaultStyle`）       |
| `groupStyle` | `IEditorButtonsGroupStyle` | -                             | 按钮整体样式（背景、圆角、内边距等），见 [整体样式](#整体样式-groupstyle) |
| `direction`  | `'top' \| 'right' \| 'bottom' \| 'left'` | `app.editor.config.buttonsDirection` 或 `'bottom'` | 按钮组方位，同时覆盖 `app.editor.config.buttonsDirection` |
| `fixed`      | `boolean`                | `app.editor.config.buttonsFixed` 或 `false` | 按钮组方位是否固定（不随元素旋转），同时覆盖 `app.editor.config.buttonsFixed` |
| `margin`     | `number`                 | `app.editor.config.buttonsMargin` 或 `12` | 按钮组与编辑框的外边距，同时覆盖 `app.editor.config.buttonsMargin` |
| `vertical`   | `boolean`                | `direction` 为 `left` / `right` 时自动竖排 | 按钮是否竖向排列                                            |
| `help`       | `boolean`                | 有按钮设置 `help` / `getHelp` 或设置了 `helpText` 时自动启用 | 是否启用帮助栏                            |
| `helpText`   | `string`                 | -                               | 帮助栏默认文案，悬浮在未单独设置 `help` 的按钮上时显示                    |
| `helpStyle`  | `IEditorButtonsHelpStyle` | 深色小胶囊                      | 帮助栏样式                                                               |
| `helpPlacement` | `'mouse' \| 'panel'`  | `'mouse'`                       | 帮助栏位置：跟随鼠标 / 固定在面板外侧                                     |
| `helpOffset` | `number`                 | `14`                            | 跟随鼠标时相对光标的偏移                                                 |
| `helpGap`    | `number`                 | `6`                             | 帮助栏与按钮面板的间距（`helpPlacement: 'panel'` 时生效）                 |
| `helpOnTap`  | `boolean`                | `false`                         | 触摸端点击按钮时短暂显示该按钮的帮助                                      |
| `helpDuration` | `number`               | `1200`                          | `helpOnTap` 的显示时长（毫秒）                                            |
| `host`       | `IGroup`                 | 编辑器本身（`app.editor`）        | 自定义挂载容器，一般不用改                                               |

> `direction` / `fixed` / `margin` 是插件参数，**传入时会覆盖 `app.editor` 上的对应配置**（编辑器自身的旋转控制点等也会同步跟随）；不传则沿用编辑器现有配置。
> 运行中也可以通过 `buttons.direction = 'top'`、`buttons.fixed = true`、`buttons.margin = 20` 实时修改。

### 按钮配置 IEditorButtonOptions

| 属性       | 类型                                                        | 默认值  | 说明                                                                                     |
| ---------- | ----------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `id`       | `string`                                                    | 自动生成 | 按钮唯一标识，用于 `remove` / `get`；重复时自动追加后缀                                  |
| `text`     | `string`                                                    | `''`    | 默认文字（初始文字，也是 `getText` 返回空时的兜底文字）；设为 `''` 表示不显示文字         |
| `getText`  | `(context) => string`                                       | -       | 动态文字回调，每次刷新时计算；返回 `''` 或非字符串时**回到 `text` 默认文字**              |
| `help`     | `string`                                                    | -       | 帮助文字，鼠标悬浮在按钮上时显示在帮助栏里                                                |
| `getHelp`  | `(context) => string`                                       | -       | 动态帮助回调，每次悬浮时计算；返回 `''` 或非字符串时回到 `help`                           |
| `showType` | `'single' \| 'multiple' \| 'all' \| 数组`                    | `'all'` | 显示条件，传数组时满足其中之一即可                                                        |
| `show`     | `(context) => boolean`                                      | -       | 显示回调（可选），返回真值显示，返回假值隐藏；在 `showType` 之后生效                       |
| `onclick`  | `(event: IPointerEvent, context) => void`                   | -       | 点击回调，事件为 `PointerEvent.TAP`                                                       |
| `style`    | `IEditorButtonStyle`                                        | -       | 按钮样式，覆盖默认样式与插件实例样式                                                      |
| `visible`  | `boolean`                                                   | `true`  | 静态显示开关，传 `false` 时按钮始终不显示，优先级最高                                     |

```ts
// 默认文字 + 动态文字（返回空字符串时回到默认文字）
buttons.add({
    text: '全选',
    getText: ({ count }) => (count > 1 ? `已选 ${count} 个` : ''),
    help: '选中画布中的全部元素',
})
```

回调上下文 `context`：

| 属性       | 类型                | 说明                                    |
| ---------- | ------------------- | --------------------------------------- |
| `buttons`  | `EditorButtons`     | 插件实例                                |
| `app`      | `IApp`              | App 实例                                |
| `editor`   | `IEditorBase`       | 编辑器实例，即 `app.editor`             |
| `button`   | `EditorButton`      | 当前按钮                                |
| `list`     | `IUI[]`             | 当前选中的元素列表                      |
| `target`   | `IUI \| IUI[]`      | 当前选中的元素，等同 `editor.target`    |
| `count`    | `number`            | 选中数量                                |
| `single`   | `boolean`           | 是否单选（选中 1 个）                   |
| `multiple` | `boolean`           | 是否多选（选中 2 个及以上）              |

### 显示条件

| showType   | 显示时机                                     |
| ---------- | -------------------------------------------- |
| `single`   | 只选中 1 个元素                              |
| `multiple` | 选中 2 个及以上元素                          |
| `all`      | 只要有选中的元素就显示（默认值）             |

> 没有任何元素被选中时，编辑器会隐藏整个编辑框，因此 `all` 表示的是"选中 1 个或多个元素时都显示"。

### 排列方式

- `direction` 为 `bottom` / `top` 时按钮**横排**（面板高一行）；
- `direction` 为 `left` / `right` 时按钮**竖排**（面板宽一列），按钮在列内水平居中，避免面板横向伸出太远；
- 需要固定排列方式时，传 `vertical: true / false`（也可运行中修改 `buttons.vertical`）。

### 帮助栏

鼠标悬浮到按钮上时显示该按钮的帮助信息，**默认跟随鼠标**（在光标右下方，贴近画布边缘时自动翻转到另一侧），离开按钮即隐藏。

```ts
const buttons = new EditorButtons(app, {
    helpText: '点击按钮执行操作', // 悬浮在未设置 help 的按钮上时显示
    helpPlacement: 'mouse', // 默认跟随鼠标；改为 'panel' 则固定在按钮面板外侧
    helpOffset: 14, // 跟随鼠标时的偏移
    helpStyle: { fill: '#1F2A44', cornerRadius: 6, padding: [4, 8], textColor: '#FFFFFF', fontSize: 11 },
    helpOnTap: true, // 触摸端点击按钮时短暂显示帮助
})

buttons.add({ text: '复制', help: '复制选中的元素' })
buttons.add({ text: '移除', getHelp: ({ count }) => `移除选中的 ${count} 个元素` })
buttons.add({ text: '重置' }) // 悬浮时显示 helpText
```

- 只要有一个按钮设置了 `help` / `getHelp`，或设置了 `helpText`，帮助栏就会自动启用；也可以用 `help: false` 关闭、`buttons.help = false` 运行中关闭。
- 帮助栏始终显示在最上层（与按钮面板同级、排在面板之后），并且 `hittable: false`，不会挡住按钮的鼠标事件。
- `helpStyle` 属性：`fill` / `stroke` / `strokeWidth` / `cornerRadius` / `padding` / `opacity` / `shadow` / `textColor` / `fontSize` / `fontFamily` / `fontWeight`；默认样式为深色小胶囊（`EditorButtons.defaultHelpStyle` 可全局修改）。
- 相关成员：`buttons.helpNode`（帮助栏容器）、`buttons.helpLabel`（文字元素）、`buttons.helpButton`（当前显示帮助的按钮）、`buttons.helpShown`、`buttons.getHelpText()`。

### 插件实例方法

| 方法 / 属性                       | 返回值                       | 说明                                                                     |
| --------------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| `add(options, index?)`            | `EditorButton`               | 添加一个按钮，`index` 指定插入位置                                       |
| `add(options[])`                  | `EditorButton[]`             | 批量添加                                                                 |
| `addMany(options[])`              | `EditorButtons`              | 批量添加，返回实例，方便链式调用                                         |
| `remove(id \| button \| index)`   | `boolean`                    | 移除按钮                                                                 |
| `clear()`                         | `void`                       | 移除全部按钮                                                             |
| `get(id)`                         | `EditorButton`               | 按 id 查找按钮                                                           |
| `has(id)`                         | `boolean`                    | 是否存在指定 id 的按钮                                                   |
| `indexOf(id \| button \| index)`  | `number`                     | 查找按钮索引，找不到返回 `-1`                                            |
| `forEach(fn)`                     | `void`                       | 遍历按钮                                                                 |
| `update()`                        | `EditorButtons`              | 刷新全部按钮的文字、显示状态、样式与位置（选中变化时自动调用）            |
| `layout()`                        | `EditorButtons`              | 重新排列按钮、计算整体大小，并定位到编辑框旁边                            |
| `place()`                         | `EditorButtons`              | 只重新计算整体位置（跟随编辑框）                                          |
| `setStyle(style)`                 | `EditorButtons`              | 合并实例的按钮样式并立即刷新                                             |
| `refreshStyle()`                  | `void`                       | 重新应用按钮样式到所有按钮                                               |
| `setGroupStyle(style)`            | `EditorButtons`              | 合并实例的整体样式并立即刷新                                             |
| `applyGroupStyle()`               | `void`                       | 重新应用整体样式到按钮面板（含 hover / press 状态）                       |
| `setHelpStyle(style)`             | `EditorButtons`              | 合并实例的帮助栏样式并立即刷新                                           |
| `applyHelpStyle()`                | `void`                       | 重新应用帮助栏样式                                                       |
| `getHelpText()`                   | `string`                     | 当前要显示在帮助栏里的文字（没有则为空）                                  |
| `setDirection(direction)`         | `EditorButtons`              | 设置方位，同步覆盖 `app.editor.config.buttonsDirection`                   |
| `setFixed(value)`                 | `EditorButtons`              | 设置是否固定方位，同步覆盖 `app.editor.config.buttonsFixed`               |
| `setMargin(value)`                | `EditorButtons`              | 设置外边距，同步覆盖 `app.editor.config.buttonsMargin`                    |
| `destroy()`                       | `void`                       | 销毁插件，移除全部按钮与事件监听                                         |
| `getContext(button?)`             | `IEditorButtonContext`       | 获取回调上下文                                                           |
| `app` / `editor`                  | `IApp` / `IEditorBase`       | App 与编辑器实例                                                         |
| `group`                           | `IBox`                       | 按钮面板（挂载到 `host` 上，可设置整体样式）                              |
| `helpNode` / `helpLabel`          | `IBox` / `IText`             | 帮助栏容器与文字元素                                                     |
| `helpButton`                      | `EditorButton`               | 当前正在显示帮助的按钮                                                   |
| `host`                            | `IGroup`                     | 实际挂载容器，默认编辑器本身                                              |
| `list` / `size`                   | `EditorButton[]` / `number`  | 按钮列表与数量                                                           |
| `style`                           | `IEditorButtonStyle`         | 实际生效的按钮样式（默认样式 + 实例样式），赋值可整体覆盖实例样式          |
| `groupStyle`                      | `IEditorButtonsGroupStyle`   | 实际生效的整体样式，赋值可整体覆盖实例整体样式                            |
| `helpStyle`                       | `IEditorButtonsHelpStyle`    | 实际生效的帮助栏样式，赋值可整体覆盖实例帮助栏样式                        |
| `help`                            | `boolean`                    | 是否启用帮助栏，可读可写                                                 |
| `helpShown`                       | `boolean`                    | 帮助栏当前是否正在显示                                                   |
| `vertical`                        | `boolean`                    | 按钮是否竖向排列（不传时按方位自动判断），可读可写                        |
| `gap`                             | `number`                     | 按钮间距，赋值后立即重新排列                                             |
| `direction` / `fixed` / `margin`  | `IDirection4` / `boolean` / `number` | 方位 / 是否固定 / 外边距，赋值后立即生效并同步覆盖 `app.editor`   |
| `destroyed`                       | `boolean`                    | 是否已销毁                                                               |

### 按钮实例 EditorButton

`add()` 返回的按钮实例，可用于后续动态控制：

| 方法 / 属性        | 说明                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| `set(options)`     | 局部修改按钮配置（`text` / `getText` / `help` / `showType` / `onclick` 等）并刷新 |
| `setStyle(style)`  | 覆盖按钮样式并立即刷新                                               |
| `setText(text)`    | 修改默认文字（后续刷新依然生效）                                     |
| `getText(context)` | 计算当前显示的文字                                                   |
| `getHelp(context)` | 计算当前帮助文字                                                     |
| `remove()`         | 从插件中移除自己                                                     |
| `destroy()`        | 销毁自己                                                             |
| `id` / `options`   | 按钮 id 与配置                                                       |
| `node` / `textNode`| 按钮的 `Box` 与 `Text` 元素，可做更细致的自定义                       |
| `text` / `visible` | 当前文字与显示状态                                                   |
| `style`            | 当前生效样式（默认样式 → 实例样式 → 按钮样式）                        |
| `hovered` / `pressed` / `destroyed` | 是否悬浮 / 是否按下 / 是否已销毁                    |

```ts
// 动态控制
const button = buttons.add({ id: 'tip', text: '提示' })

button.set({ text: '新文字', showType: 'single' })
button.setStyle({ fill: '#8B5CF6' })

buttons.gap = 12
buttons.setStyle({ cornerRadius: 6 })
buttons.remove('tip')
```

### 样式 IEditorButtonStyle

| 属性           | 类型                                | 默认值        | 说明                                    |
| -------------- | ----------------------------------- | ------------- | --------------------------------------- |
| `fill`         | `IFill`                             | `'#3D7EFF'`   | 按钮底色                                |
| `stroke`       | `IStroke`                           | -             | 按钮描边                                |
| `strokeWidth`  | `number`                            | -             | 描边宽度                                |
| `cornerRadius` | `number \| number[]`                | `20`          | 圆角                                    |
| `padding`      | `IFourNumber`                       | `[7, 10]`     | 文字与按钮边缘的内边距                  |
| `textColor`    | `IColorString`                      | `'#FFFFFF'`   | 文字颜色                                |
| `fontSize`     | `number`                            | `12`          | 文字大小                                |
| `fontFamily`   | `string`                            | -             | 字体                                    |
| `fontWeight`   | `IFontWeight`                       | -             | 字重                                    |
| `cursor`       | `ICursorType`                       | `'pointer'`   | 鼠标样式                                |
| `opacity`      | `number`                            | `1`           | 透明度                                  |
| `hover`        | `{ fill?, textColor?, opacity? }`   | `#5A93FF` 底色 | 悬浮样式，叠加在基础样式上              |
| `press`        | `{ fill?, textColor?, opacity? }`   | `#2B6BE6` 底色 | 按下样式                                |

样式按 **默认样式 → 插件实例样式 → 按钮样式** 逐层合并（忽略 `undefined`，`hover` / `press` 做一层浅合并）：

```ts
// 1. 全局默认样式（影响之后创建的所有插件实例）
EditorButtons.defaultStyle.fill = '#1F2A44'
EditorButtons.defaultStyle.hover.fill = '#33415C'

// 2. 插件实例样式
const buttons = new EditorButtons(app, { style: { cornerRadius: 20 } })
buttons.setStyle({ fontSize: 13 }) // 合并
buttons.style = { fill: '#123456' } // 整体覆盖实例样式

// 3. 单个按钮样式（优先级最高）
buttons.add({ text: '删除', style: { fill: '#FF5B5B', hover: { fill: '#FF7878' } } })
```

### 整体样式 groupStyle

`groupStyle` 作用在包住所有按钮的面板上，用来把一排按钮做成一个整体（背景、圆角、描边、阴影、内边距、hover / press 状态）：

| 属性           | 类型                        | 默认值 | 说明                                                          |
| -------------- | --------------------------- | ------ | ------------------------------------------------------------- |
| `fill`         | `IFill`                     | -      | 背景色（不设置则不绘制背景）                                  |
| `stroke`       | `IStroke`                   | -      | 描边                                                          |
| `strokeWidth`  | `number`                    | -      | 描边宽度                                                      |
| `cornerRadius` | `number \| number[]`        | `0`    | 圆角                                                          |
| `padding`      | `IFourNumber`               | 有背景时 `4` | 内容与面板边缘的间距，如 `[5, 6]`（上 右 下 左）        |
| `opacity`      | `number`                    | `1`    | 透明度                                                        |
| `shadow`       | `IShadowEffect \| IShadowEffect[]` | - | 阴影，如 `{ x: 0, y: 2, blur: 8, color: '#1F2A441F' }`      |
| `hover`        | `IEditorButtonsGroupStateStyle` | -  | 鼠标移到按钮或面板上时的样式（`fill` / `stroke` / `strokeWidth` / `cornerRadius` / `opacity` / `shadow`） |
| `press`        | `IEditorButtonsGroupStateStyle` | -  | 按下按钮时的样式                                              |
| `transition`   | `ITransition`               | -      | 状态切换过渡动画，如 `0.12` 或 `{ duration: 0.2, easing: 'ease' }`（**需安装 `@leafer-in/animate`**） |

```ts
const buttons = new EditorButtons(app, {
    gap: 6,
    groupStyle: {
        fill: '#FFFFFF',
        cornerRadius: 12,
        stroke: '#DCE3EE',
        strokeWidth: 1,
        padding: [5, 6], // 不设置且存在背景时默认 4
        shadow: { x: 0, y: 2, blur: 8, color: '#1F2A441F' },
        hover: { stroke: '#A9C0FF', fill: '#F7F9FF' }, // 悬浮（按钮上或面板上都可以触发）
        press: { fill: '#EEF3FF' },
        transition: 0.12, // 需安装 @leafer-in/animate
    },
})

// 运行中修改 / 移除
buttons.setGroupStyle({ cornerRadius: 6 })
buttons.groupStyle = {} // 移除背景与内边距

// 全局默认整体样式
EditorButtons.defaultGroupStyle.cornerRadius = 12
```

> `hover` / `press` 的触发范围：鼠标位于任一按钮上，或（面板设置了背景时）位于面板矩形内。

## 说明

- **位置由插件自己计算**：以编辑框的显示范围为基准，按 `direction` 向外偏移 `margin`，因此元素旋转任意角度、翻转后位置都正确；`fixed: true`（默认跟随 `app.editor.config.buttonsFixed`）时按钮始终保持水平或垂直。
- `direction` / `fixed` / `margin` 会同步覆盖 `app.editor` 上的 `buttonsDirection` / `buttonsFixed` / `buttonsMargin`，编辑器自身的旋转控制点位置也会一起变化。
- 按钮组跟随编辑框显示：没有选中元素、元素被锁定、`hideOnMove` 拖动中、`hideOnSmall` 元素过小时都会自动隐藏。
- 元素被移动 / 缩放 / 旋转（含手势、viewport 缩放）时自动跟随刷新。
- 按钮被隐藏时使用 `visible = 0`（相当于 CSS `display: none`），因此**不会占用布局空间**，剩余按钮会自动重新排列。
- 帮助栏默认跟随鼠标（贴边自动翻转），`helpPlacement: 'panel'` 时改为固定在面板外侧并跟随面板旋转；两种模式都不会改变按钮面板的定位，所以显示 / 隐藏时按钮不会跳动。
- 想替换成自己的布局或元素，可以直接读取 `button.node` / `button.textNode` / `buttons.helpNode` 做二次定制，或通过 `host` 选项把按钮组挂到别的容器上。

### 从旧版本升级（0.1.0 之前）

`text` 不再支持传回调，拆分为 `text`（默认文字）+ `getText`（动态文字），回调返回 `''` 时会回到 `text` 默认文字：

```ts
// 旧写法
buttons.add({ text: ({ count }) => (count > 1 ? `已选 ${count} 个` : '全选') })

// 新写法
buttons.add({ text: '全选', getText: ({ count }) => (count > 1 ? `已选 ${count} 个` : '') })
```

`setText()` 现在修改的是按钮的默认文字（后续刷新不会被覆盖回去）。

## 开发

```sh
npm run start # 启动开发服务 http://localhost:12121 (demo 入口 main.ts)
npm run build # 打包到 dist，并生成 types
npm run test  # 运行单元测试
```

```
src/index.ts          # 导出
src/EditorButtons.ts  # 插件主体（实例、按钮管理、自动排列与定位、帮助栏）
src/EditorButton.ts   # 单个按钮（显示条件、文字 / 帮助、交互、样式）
src/style.ts          # 默认样式与样式合并
src/type.ts           # 类型定义
src/util.ts           # 小工具
```

## License

MIT
