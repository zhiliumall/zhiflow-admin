<script setup lang="ts">
/**
 * 订单发货抽屉（订单列表、订单详情共用）。
 *
 * 快递发货：物流公司取字典「快递公司」（express_company，在「字典管理」里维护），填运单号。
 * 收货信息默认带订单上的，发货时可改（后端写进物流单）。
 * 提交 `PUT /mall/orderinfo/delivery`；成功 emit('done')，由宿主页刷新数据。
 */
import { ref, watch } from "vue";
import { delivery } from "@/api/mall/orderinfo";
import { remote } from "@/api/upms/dict";
import { message } from "@/components/overlay";

defineOptions({ name: "OrderDeliveryDrawer" });

/** 物流公司字典 type，与后端 ExpressCompanyDict.DICT_TYPE 一致 */
const EXPRESS_COMPANY_DICT = "express_company";

const props = defineProps<{
  modelValue: boolean;
  /** 要发货的订单：至少带 id / recName / recTel / recAddress / listOrderItem */
  order: Record<string, any> | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "busy", busy: boolean): void;
  (e: "done"): void;
}>();

const formRef = ref();
const submitting = ref(false);
const companies = ref<Array<{ label: string; value: string }>>([]);
const form = ref({
  recName: "",
  recTel: "",
  recAddress: "",
  logisticsCode: "",
  logisticsNo: "",
});
const rules = {
  recName: [{ required: true, message: "请输入收货人姓名", trigger: "blur" }],
  recTel: [{ required: true, message: "请输入收货人电话", trigger: "blur" }],
  recAddress: [{ required: true, message: "请输入收货地址", trigger: "blur" }],
  logisticsCode: [{ required: true, message: "请选择物流公司", trigger: "change" }],
  logisticsNo: [{ required: true, message: "请输入运单号", trigger: "blur" }],
};

function loadCompanies() {
  remote(EXPRESS_COMPANY_DICT)
    .then((res: any) => {
      companies.value = (res?.data || []).map((d: any) => ({ label: d.label, value: d.value }));
    })
    .catch(() => {
      companies.value = [];
    });
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    const o = props.order || {};
    form.value = {
      recName: o.recName || "",
      recTel: o.recTel || "",
      recAddress: o.recAddress || "",
      logisticsCode: "",
      logisticsNo: "",
    };
    formRef.value?.clearValidate?.();
    loadCompanies();
  },
);

function close() {
  emit("update:modelValue", false);
}

async function onSubmit() {
  if (submitting.value || !props.order?.id) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }
  submitting.value = true;
  emit("busy", true);
  try {
    await delivery({
      orderId: String(props.order.id),
      orderItemIds: (props.order.listOrderItem || []).map((i: any) => i.id).join(","),
      deliveryType: "1",
      logisticsCode: form.value.logisticsCode,
      logisticsNo: form.value.logisticsNo.replace(/\s/g, ""),
      recName: form.value.recName,
      recTel: form.value.recTel,
      recAddress: form.value.recAddress,
    });
    message.success("发货成功");
    close();
    emit("done");
  } catch {
    // 拦截器已提示后端原话（如订单状态不能发货、物流公司不在字典里）
  } finally {
    submitting.value = false;
    emit("busy", false);
  }
}
</script>

<template>
  <el-drawer :model-value="modelValue" :size="640" append-to-body class="delivery-drawer"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)">
    <template #header>
      <div class="delivery-header">
        <h3 class="delivery-header__title">发货</h3>
        <p class="delivery-header__subtitle">
          订单 {{ order?.orderNo || "--" }} · 请填写物流公司与运单号
        </p>
      </div>
    </template>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="delivery-form" @submit.prevent>
      <div class="delivery-section">
        <div class="delivery-section__title">收货人信息</div>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="收货人姓名" prop="recName">
              <el-input v-model="form.recName" placeholder="请输入" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收货人电话" prop="recTel">
              <el-input v-model="form.recTel" placeholder="请输入" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="收货地址" prop="recAddress">
          <el-input v-model="form.recAddress" type="textarea" :rows="2" placeholder="请输入" />
        </el-form-item>
      </div>

      <div class="delivery-section">
        <div class="delivery-section__title">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          物流信息
        </div>
        <el-form-item label="物流公司" prop="logisticsCode">
          <el-select v-model="form.logisticsCode" placeholder="请选择" filterable style="width: 100%"
            no-data-text="字典「快递公司」(express_company) 暂无数据，请先在字典管理里维护">
            <el-option v-for="item in companies" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="运单号" prop="logisticsNo">
          <el-input v-model="form.logisticsNo" placeholder="请输入" maxlength="30" />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <div class="delivery-footer">
        <el-button @click="close">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">发货</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped lang="scss">
.delivery-header {
  &__title {
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 700;
    line-height: 1.3;
    color: var(--dc-text-1);
  }

  &__subtitle {
    margin: 0;
    font-size: 14px;
    line-height: 1.5715;
    color: var(--dc-text-3);
  }
}

.delivery-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.delivery-section {
  padding: 20px;
  margin-bottom: 16px;
  background: var(--dc-bg-header, #f8f9fb);
  border-radius: 10px;

  &:last-child {
    margin-bottom: 0;
  }

  &__title {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-bottom: 16px;
    font-size: 15px;
    font-weight: 600;
    color: var(--dc-text-1);

    svg {
      color: var(--dc-brand);
    }
  }
}

.delivery-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;

  .el-button--primary {
    min-width: 80px;
  }
}
</style>
