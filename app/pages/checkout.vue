<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Checkout</h1>

    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 bg-white rounded-xl border p-6">
        <Form @submit="onSubmit" :validation-schema="schema">
          <div class="grid sm:grid-cols-2 gap-4">
            <Field name="fullName" v-slot="{ field, errors }">
              <Label class="mb-1">Full Name</Label>
              <Input v-bind="field" />
              <span class="text-red-600 text-xs">{{ errors[0] }}</span>
            </Field>

            <Field name="email" v-slot="{ field, errors }">
              <Label class="mb-1">Email</Label>
              <Input type="email" v-bind="field" />
              <span class="text-red-600 text-xs">{{ errors[0] }}</span>
            </Field>

            <Field name="address" v-slot="{ field, errors }" class="sm:col-span-2">
              <Label class="mb-1">Address</Label>
              <Input v-bind="field" />
              <span class="text-red-600 text-xs">{{ errors[0] }}</span>
            </Field>
          </div>

          <Button type="submit" class="mt-6 w-full sm:w-auto">Pay with Razorpay</Button>
        </Form>
      </div>

      <div class="bg-white rounded-xl border p-6 h-fit">
        <h3 class="text-lg font-bold mb-4">Order Summary</h3>
        <div class="space-y-3">
          <div class="flex justify-between"><span>Subtotal:</span><span>${{ subtotal.toFixed(2) }}</span></div>
          <div class="flex justify-between"><span>Shipping & Tax:</span><span>${{ shipping.toFixed(2) }}</span></div>
          <div class="border-t pt-3 flex justify-between font-bold text-lg"><span>Total:</span><span>${{ total.toFixed(2) }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Form, Field } from 'vee-validate'
import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { computed } from 'vue'
import { useRuntimeConfig, definePageMeta, navigateTo } from '#imports'
import { useCartStore } from '@/stores/cart'
import { $fetch } from 'ofetch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'

const cart = useCartStore()
const subtotal = computed(() => cart.total)
const shipping = computed(() => (cart.items.length ? 10 : 0))
const total = computed(() => subtotal.value + shipping.value)

const schema = toTypedSchema(
  z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    address: z.string().min(6),
  })
)

const config = useRuntimeConfig()

const onSubmit = async (values: any) => {
  // Create order on server -> Supabase edge function
  try {
    const { data } = await $fetch('/api/payments/create-order', {
      method: 'POST',
      body: { amount: Math.round(total.value * 100), currency: 'USD' },
    })

    // Initialize Razorpay checkout (client-side)
    const options: any = {
      key: config.public.razorpayKeyId,
      amount: data.amount,
      currency: data.currency,
      name: 'Blackhorse PetShop',
      description: 'Order payment',
      order_id: data.id,
      prefill: { name: values.fullName, email: values.email },
      theme: { color: '#0f766e' },
      handler: function (_response: any) {
        toast.success('Payment successful')
        navigateTo('/')
      },
    }
    // @ts-ignore
    const rzp = new (window as any).Razorpay(options)
    rzp.open()
    toast.success('Opening Razorpay checkout')
  } catch (e) {
    console.error(e)
    toast.error('Failed to create order')
  }
}

definePageMeta({ layout: 'default' })
</script>
