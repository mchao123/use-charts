import { type EChartsType, type EChartsOption, init } from 'echarts';
import { type MaybeRefOrGetter, toValue, nextTick, onUnmounted, watch, defineComponent, type PropType, watchPostEffect, h } from 'vue';
type Fn<T> = (arg: T, echarts: EChartsType[]) => EChartsOption;

/**定义图表组件
 * 
 * @example
 * ```ts
 * // MyChart.ts
 * const ChartBarTestOpts = {
 *   title: {
 *    text: 'ECharts 入门示例'
 *   },
 *   tooltip: {},
 *   xAxis: {
 *     type: 'category',
 *   },
 *   yAxis: {
 *     type: 'value'
 *   },
 * }
 * export const ChartBarTest = defineCharts(ChartBarTestOpts, (data:{name:string, value:number}[], echarts) => {
 *    return {
 *       xAxis: {
 *          type: 'category',
 *        data: data.map(({name})=>name)
 *      },
 *     yAxis: {
 *       type: 'value'
 *    },
 *   series: [{
 *    data: data.map(({value})=>value),
 *   type: 'bar'
 * }]
 */
export const defineCharts = <T extends EChartsOption, U>(opt: T, fn: Fn<U>) => [opt, fn] as [T, Fn<U>];

/**使用图表，需要在setup中使用，否则可能导致内存泄漏
 * 
 * @example
 * ```ts
 * const { createChartEl, createChartComp } = useCharts();
 * ```
 */
export const useCharts = () => {
    const resizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
            // @ts-ignore
            entry.target.__resize();
        });
    });
    const AbortSignals: AbortController[] = [];
    // 监听器
    const Watchs: ReturnType<typeof watch>[] = [];
    onUnmounted(() => {
        AbortSignals.forEach((signal) => {
            signal.abort();
        });
        Watchs.forEach((unwatch) => {
            unwatch();
        });
        resizeObserver.disconnect();
    });
    const createChart = <Opt extends EChartsOption,>(opts: Opt) => {
        const AbortSignal = new AbortController();
        AbortSignals.push(AbortSignal);
        let charts: { el: HTMLElement, chart: EChartsType; }[] = [];
        // 移除无效的图表
        const removeInvalidChart = () => {
            charts = charts.filter(({ el }) => el.parentElement);
        };
        const setOption = (opts: Opt) => {
            removeInvalidChart();
            charts.forEach(({ chart }) => {
                chart.setOption(opts);
            });
        };
        // window.addEventListener('resize', () => {
        //     charts.forEach(({ chart,el }) => {
        //         chart.resize();
        //     });
        // }, { signal: AbortSignal.signal });

        // const observers = charts.map(({ chart, el }) => {
        //     const observer = new ResizeObserver((entries) => {
        //         entries.forEach((entry) => {
        //             chart.resize();
        //         });
        //     });

        //     observer.observe(el);
        //     return observer;
        // });
        // 初始化列表
        const initList: ((echart: EChartsType, el: HTMLElement) => void)[] = [];
        const onInit = (fn: (echart: EChartsType, el: HTMLElement) => void) => {
            initList.push(fn);
            return () => {
                initList.splice(initList.indexOf(fn), 1);
            };
        };
        const initEl = (el: HTMLElement | null) => {
            if (!el || charts.some(({ el: _el }) => _el === el)) return;
            nextTick(() => {
                removeInvalidChart();
                const chart = init(el);
                resizeObserver.observe(el);
                // @ts-ignore
                el.__resize = () => chart.resize();
                charts.push({ el, chart });
                opts && chart.setOption(opts);
                initList.forEach((fn) => {
                    fn(chart, el);
                });
            });
        };

        return {
            el: () => h('div', { ref: initEl as any }),
            charts,
            AbortSignal,
            setOption,
            onInit
        };
    };

    const createChartEl = <T extends [any, any], TT extends MaybeRefOrGetter<Parameters<T[1]>[0]>, Opt extends EChartsOption>(code: T, data: TT, opts?: MaybeRefOrGetter<Opt>) => {
        const { el, charts, setOption, onInit } = createChart(code[0]);
        onInit((chart) => {
            chart.setOption(code[1](toValue(data), charts));
            opts && chart.setOption(toValue(opts));
        });
        Watchs.push(watch(() => data, (data) => {
            setOption(code[1](toValue(data), charts));
        }, { deep: true }));
        opts && Watchs.push(watch(() => opts, (opts) => {
            setOption(toValue(opts));
        }, { deep: true }));
        return el;

    };
    const createChartComp = <T extends [any, any], TT extends MaybeRefOrGetter<Parameters<T[1]>[0]>, Opt extends EChartsOption>(code: T) => {
        // const data = shallowRef<TT | undefined>();
        // const opts = shallowRef<Opt | undefined>();

        return defineComponent({
            props: {
                data: {
                    type: Object as PropType<TT>,
                    required: true
                },
                opts: {
                    type: Object as PropType<Opt>,
                }
            },
            setup(props) {

                const { el, charts, setOption, onInit } = createChart(code[0]);
                onInit((chart) => {
                    chart.setOption(code[1](props.data, charts));
                    props.opts && chart.setOption(props.opts);
                });
                watchPostEffect(() => {
                    setOption(code[1](props.data, charts));
                    props.opts && setOption(props.opts);
                });
                return el;
            }
        });

    };
    return {
        /**创建图表标签
         * @param 图表模板
         * @param data 数据（支持响应式）
         * @param opts 选项（支持响应式）
         * @return 图表元素（顶层div可以直接使用原生属性）
         * 
         * @example
         * ```ts
         * // setup
         * const MyChart = createChartEl(ChartBarTest, data, opts);
         * 
         * ```
         * ```vue
         * // template
         * <MyChart class="h-full w-full"/>
         * 
         */
        createChartEl,
        /**创建图表组件
         * @param 图表模板
         * @return 图表组件（顶层div可以直接使用原生属性）
         * 
         * @example
         * ```ts
         * // setup
         * 
         * const MyChart = createChartComp(ChartBarTest);
         * 
         * ```
         * ```vue
         * // template
         * 
         * <MyChart class="h-full w-full" :data="data" :opts="opts" />
         * 
         * ```
         */
        createChartComp
    };
};