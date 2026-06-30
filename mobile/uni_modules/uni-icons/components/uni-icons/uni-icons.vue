<template>
	<!-- #ifdef APP-NVUE -->
	<text :style="styleObj" class="uni-icons" @click="_onClick">{{unicode}}</text>
	<!-- #endif -->
	<!-- #ifndef APP-NVUE -->
	<text :style="styleObj" class="uni-icons" :class="['uniui-'+type,customPrefix,customPrefix?type:'']" @click="_onClick">
		<slot></slot>
	</text>
	<!-- #endif -->
</template>

<script>
	import { fontData } from './uniicons_file_vue.js';
	import iconFontUrl from './uniicons.ttf';

	const getVal = (val) => {
		const reg = /^[0-9]*$/g
		return (typeof val === 'number' || reg.test(val)) ? val + 'px' : val;
	}

	const injectFontFace = () => {
		// #ifdef APP-NVUE
		const domModule = weex.requireModule('dom');
		domModule.addRule('fontFace', {
			'fontFamily': "uniicons",
			'src': "url('" + iconFontUrl + "')"
		});
		// #endif

		// #ifndef APP-NVUE
		if (typeof document === 'undefined' || document.getElementById('uni-icons-font-face')) return
		const style = document.createElement('style')
		style.id = 'uni-icons-font-face'
		style.innerHTML = `@font-face{font-family:uniicons;src:url("${iconFontUrl}") format("truetype");font-weight:normal;font-style:normal;}`
		document.head.appendChild(style)
		// #endif
	}

	/**
	 * Icons 图标
	 * @description 用于展示 icons 图标
	 * @tutorial https://ext.dcloud.net.cn/plugin?id=28
	 * @property {Number} size 图标大小
	 * @property {String} type 图标图案，参考示例
	 * @property {String} color 图标颜色
	 * @property {String} customPrefix 自定义图标
	 * @event {Function} click 点击 Icon 触发事件
	 */
	export default {
		name: 'UniIcons',
		emits: ['click'],
		props: {
			type: {
				type: String,
				default: ''
			},
			color: {
				type: String,
				default: '#333333'
			},
			size: {
				type: [Number, String],
				default: 16
			},
			customPrefix: {
				type: String,
				default: ''
			},
			fontFamily: {
				type: String,
				default: ''
			}
		},
		data() {
			return {
				icons: fontData
			}
		},
		created() {
			injectFontFace()
		},
		computed: {
			unicode() {
				let code = this.icons.find(v => v.font_class === this.type)
				if (code) {
					return code.unicode
				}
				return ''
			},
			iconSize() {
				return getVal(this.size)
			},
			styleObj() {
				if (this.fontFamily !== '') {
					return `color: ${this.color}; font-size: ${this.iconSize}; font-family: ${this.fontFamily};`
				}
				return `color: ${this.color}; font-size: ${this.iconSize};`
			}
		},
		methods: {
			_onClick(e) {
				this.$emit('click', e)
			}
		}
	}
</script>

<style lang="scss">
	/* #ifndef APP-NVUE */
	@import './uniicons.css';

	@font-face {
		font-family: uniicons;
		src: url('./uniicons.ttf');
	}

	/* #endif */
	.uni-icons {
		font-family: uniicons;
		text-decoration: none;
		text-align: center;
	}
</style>
