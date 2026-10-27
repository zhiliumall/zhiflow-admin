<template>
  <div class="areabox">
    <el-select v-model="address.province" class="select-item" placeholder="请选择省" @change="handleProvinceSelect">
      <el-option v-for="item in regionData" :label="item.label" :value="item.value" />
    </el-select>
    <el-select v-model="address.city" class="select-item" placeholder="请选择市"
      :disabled="!address.province || cityList.length == 0" @change="handleCitySelect">
      <el-option v-for="item in cityList" :label="item.label" :value="item.value" />
    </el-select>
    <el-select v-model="address.area" class="select-item" placeholder="请选择区"
      :disabled="!address.province || !address.city || areaList.length == 0" @change="handleAreaSelect">
      <el-option v-for="item in areaList" :label="item.label" :value="item.value" />
    </el-select>
  </div>
</template>
<script lang="ts" setup>
import { codeToText, regionData } from "element-china-area-data";
import { type ComputedRef, computed, reactive } from "vue";

//抛出地址
const emit = defineEmits<
  (
    e: "getAddress",
    data: {
      code: string[]; //区域码
      name: string[]; //汉字
      isComplete: boolean; //是否选择完整，方便校验
    },
  ) => void
>();
const address = reactive<{
  province: string;
  city: string;
  area: string;
}>({
  province: "",
  city: "",
  area: "",
});
interface AreaList {
  value: string;
  label: string;
  children?: AreaList[];
}
//切换省份函数
const handleProvinceSelect = () => {
  address.city = "";
  address.area = "";

  emit("getAddress", {
    code: [address.province], //区域码
    name: [codeToText[address.province]], //汉字
    isComplete: false,
  });
};

//切换城市函数
const handleCitySelect = () => {
  address.area = "";

  emit("getAddress", {
    code: [address.province, address.city], //区域码
    name: [codeToText[address.province], codeToText[address.city]], //汉字
    isComplete: false,
  });
};

//切换地区函数
const handleAreaSelect = () => {
  emit("getAddress", {
    code: [address.province, address.city, address.area], //区域码
    name: [
      codeToText[address.province],
      codeToText[address.city],
      codeToText[address.area],
    ], //汉字
    isComplete: true,
  });
};
//二级城市列表
const cityList: ComputedRef<AreaList[]> = computed((): AreaList[] => {
  if (!address.province) {
    return [];
  }
  const temp = regionData.find((item: any) => {
    return item.value === address.province;
  });
  return temp.children ? temp.children : [];
});
//三级地区列表
const areaList: ComputedRef<AreaList[]> = computed((): AreaList[] => {
  if (!address.province || !address.city) {
    return [];
  }
  if (cityList.value.length === 0) {
    return [];
  } else {
    const temp = cityList.value.find((item: any) => {
      return item.value === address.city;
    });
    if (temp) {
      return temp.children ? temp.children : [];
    } else {
      return [];
    }
  }
});

// 清空已选地址
const clearAddress = () => {
  address.province = "";
  address.city = "";
  address.area = "";
};

// 初始化地址
const initAddress = (fullAddress: string) => {
  clearAddress();
  if (!fullAddress) return fullAddress;

  let remaining = fullAddress;

  // 1. 匹配省份
  const province = regionData.find((p) => remaining.startsWith(p.label) || (p.label.endsWith('市') && remaining.startsWith(p.label.slice(0, -1))) || (p.label.endsWith('省') && remaining.startsWith(p.label.slice(0, -1))));

  if (province) {
    address.province = province.value;
    // 如果是匹配到了不带"省"或"市"的情况，需要手动计算切掉的长度
    if (remaining.startsWith(province.label)) {
      remaining = remaining.slice(province.label.length);
    } else {
      // 假设是去掉了最后一个字的情况（如"北京"匹配"北京市"）
      remaining = remaining.slice(province.label.length - 1);
    }

    // 处理地址中重复省份名的情况 (例如: "北京北京市...")
    if (remaining.startsWith(province.label)) {
      remaining = remaining.slice(province.label.length);
    } else if (province.label.endsWith('市') && remaining.startsWith(province.label.slice(0, -1))) {
      // 如果剩下的是 "北京市..." (province.label) 已经被上面处理了
      // 如果剩下的是 "北京..." (简称)
      // 只有当它后面不紧跟 "市" 字，或者紧跟的是区名时才切？
      // 简单策略：如果是直辖市，且剩余部分以简称开头，再切一次
      if (['北京市', '天津市', '上海市', '重庆市'].includes(province.label)) {
        remaining = remaining.slice(province.label.length - 1);
      }
    }

    // 2. 匹配城市
    const cities = province.children || [];
    let city = cities.find((c) => remaining.startsWith(c.label) || (c.label.endsWith('市') && remaining.startsWith(c.label.slice(0, -1))));

    // 特殊处理直辖市的"市辖区"
    if (!city && (province.label === '北京市' || province.label === '天津市' || province.label === '上海市' || province.label === '重庆市')) {
      // 如果剩余地址还是以"市辖区"开头(不太可能)，或者直接是区名
      const district = cities.find(c => c.label === '市辖区' || c.label === '县');
      if (district) {
        // 尝试直接匹配区县
        const areas = district.children || [];
        // 增加对 "市辖区" 字样的容错
        if (remaining.startsWith('市辖区')) {
          remaining = remaining.slice(3);
        }
        const area = areas.find((a) => remaining.startsWith(a.label));
        if (area) {
          city = district; // 隐式匹配到市辖区
        }
      }
    }

    if (city) {
      address.city = city.value;
      if (remaining.startsWith(city.label)) {
        remaining = remaining.slice(city.label.length);
      } else if (city.label.endsWith('市') && remaining.startsWith(city.label.slice(0, -1))) {
        remaining = remaining.slice(city.label.length - 1);
      }
      // 直辖市"市辖区"不占用地址字符，不需要slice

      // 3. 匹配区县
      const areas = city.children || [];
      const area = areas.find((a) => remaining.startsWith(a.label));

      if (area) {
        address.area = area.value;
        remaining = remaining.slice(area.label.length);
      }
    }
  }

  return remaining;
};

defineExpose({
  clearAddress,
  initAddress,
});
</script>
<style scoped lang="scss">
.areabox {
  display: inline-flex;
  align-items: center;

  .select-item {
    // width: 283.5px;
    // margin-right: 20px;
  }
}
</style>
