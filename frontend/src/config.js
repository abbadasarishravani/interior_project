const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G0ab'

export { API_BASE, RAZORPAY_KEY_ID }
export default API_BASE