import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'

Vue.config.productionTip = false
Vue.config.devtools = false

new Vue({
    render: h => h(App),
}).$mount('#app')
