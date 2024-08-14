# use-charts

## 📖 Description

Easily reuse your echarts charts in vue3.

## 📦 Install

```bash
npm install vue-use-charts
```

<!-- 依赖vue3和echarts -->
## 🛠️ Dependencies

[Vue](https://vuejs.org/)
[Echarts](https://echarts.apache.org/)


## 🤖 Usage

```ts
import { ref } from 'vue'
import { useCharts } from 'vue-use-charts'
import { ChartDemo } from './charts/demo'

const { createChartComp } = useCharts()
const MyChart = createChartComp(ChartDemo)
const data = ref({
  // ...
})

const echartsOpts = {
  // ...
}
```
```html
<template>
  <MyChart :data="data" :opts="echartsOpts" class="my-chart"/>
</template>
```

## Thanks
- [vue3](https://github.com/vuejs/core)
- [echarts](https://github.com/apache/echarts)
-
## License

MIT
