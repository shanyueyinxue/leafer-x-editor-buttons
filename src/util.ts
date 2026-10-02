import type { IUI, IUIInputData } from '@leafer-ui/interface'


/**
 * 设置元素属性
 *
 * 传入的字段会全部生效，值为 undefined 时恢复元素默认值
 * （样式类属性用它来表达"移除该样式"）
 */
export function setAttrs(ui: IUI, data: IUIInputData): void {
    ui.set(data)
}

/** 单位向量，长度为 0 时返回默认方向 */
export function normalizeVector(x: number, y: number): { x: number, y: number } {
    const length = Math.sqrt(x * x + y * y)
    return length ? { x: x / length, y: y / length } : { x: 0, y: 0 }
}
