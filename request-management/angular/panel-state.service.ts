import { Injectable } from '@angular/core'

import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout'

import { combineLatest, BehaviorSubject, Observable } from 'rxjs'
import { distinctUntilChanged, map, skipUntil } from 'rxjs/operators'


export enum Panel {
	one = 'one',
	two = 'two',
	three = 'three'
}

enum ScreenSize {
	small = '(max-width: 599.99px)',
	medium = '(min-width: 600px) and (max-width: 959.99px)',
	large = '(min-width: 960px)'
}

enum OnOff {
	on = 1,
	off = 0
}

export type PanelsVisibility = {
	[Panel.one] :OnOff
	[Panel.two] :OnOff
	[Panel.three] :OnOff
}


@Injectable()
export class PanelStateService {
	constructor(
		private breakpointObserver :BreakpointObserver
	) {}

	// видимость панелей в зависимости от размера экрана и от того какие панели включены/выключены пользователем
	// формат [размер экрана, вторая панель, третья панель]
	private panelsVisibilityMatrix = new Map([
		[ScreenSize.small, new Map([
			[OnOff.on, new Map([
				[OnOff.on, {[Panel.one]: OnOff.off, [Panel.two]: OnOff.off, [Panel.three]: OnOff.on}],
				[OnOff.off, {[Panel.one]: OnOff.off, [Panel.two]: OnOff.on, [Panel.three]: OnOff.off}]
			])],
			[OnOff.off, new Map([
				[OnOff.on, {[Panel.one]: OnOff.on, [Panel.two]: OnOff.off, [Panel.three]: OnOff.off}],
				[OnOff.off, {[Panel.one]: OnOff.on, [Panel.two]: OnOff.off, [Panel.three]: OnOff.off}]
			])]
		])],
		[ScreenSize.medium, new Map([
			[OnOff.on, new Map([
				[OnOff.on, {[Panel.one]: OnOff.off, [Panel.two]: OnOff.on, [Panel.three]: OnOff.on}],
				[OnOff.off, {[Panel.one]: OnOff.on, [Panel.two]: OnOff.on, [Panel.three]: OnOff.off}]
			])],
			[OnOff.off, new Map([
				[OnOff.on, {[Panel.one]: OnOff.on, [Panel.two]: OnOff.on, [Panel.three]: OnOff.off}],
				[OnOff.off, {[Panel.one]: OnOff.on, [Panel.two]: OnOff.on, [Panel.three]: OnOff.off}] // панель detail выключена но она должна отображаться, просто быть пустой
			])]
		])],
		[ScreenSize.large, new Map([
			[OnOff.on, new Map([
				[OnOff.on, {[Panel.one]: OnOff.on, [Panel.two]: OnOff.on, [Panel.three]: OnOff.on}],
				[OnOff.off, {[Panel.one]: OnOff.on, [Panel.two]: OnOff.on, [Panel.three]: OnOff.off}]
			])],
			[OnOff.off, new Map([
				[OnOff.on, {[Panel.one]: OnOff.on, [Panel.two]: OnOff.on, [Panel.three]: OnOff.off}],
				[OnOff.off, {[Panel.one]: OnOff.on, [Panel.two]: OnOff.on, [Panel.three]: OnOff.off}] // панель detail выключена но она должна отображаться, просто быть пустой
			])]
		])],
	])

	// список панелей с состоянием открыта(true)/закрыта(false) пользователем
	// панель list считается постоянно открытой
	private panelsOnOff :PanelsVisibility = {
		[Panel.one]: OnOff.on, // не используется (не меняется), здесь для общей картины
		[Panel.two]: OnOff.off,
		[Panel.three]: OnOff.off
	}
	private panelsOnOffSubject = new BehaviorSubject(this.panelsOnOff)

	// возвращает Observable объект в котором указано какие панели нужно display:none
	stateChange() :Observable<PanelsVisibility> {
		const breakpointObserver = this.breakpointObserver.observe([
			ScreenSize.small,
			ScreenSize.medium,
			ScreenSize.large
		]).pipe(map((bs :BreakpointState) :ScreenSize => {
			const currentBreakpoint :string = Object.keys(bs.breakpoints).find(key => bs.breakpoints[key])
			const screenSize :string = Object.keys(ScreenSize).find(key => ScreenSize[key] === currentBreakpoint)
			return ScreenSize[screenSize]
		}))
		const panelObserver = this.panelsOnOffSubject.asObservable().pipe(skipUntil(breakpointObserver))

		const combinedObserver = combineLatest([
			breakpointObserver,
			panelObserver
		]).pipe(map(([screenSize, {two, three}]) => {
			this.panelsOnOff = this.panelsVisibilityMatrix.get(screenSize).get(two).get(three)
			return this.panelsOnOff
		}))

		return combinedObserver
	}

	panelStateChange(panel :Panel) :Observable<OnOff> {
		return this.stateChange().pipe(
			map((state :PanelsVisibility) => {
				return state[panel]
			}),
			distinctUntilChanged()
		)
	}

	panelOpen(panel :Panel) {
		this.panelsOnOffSubject.next({...this.panelsOnOff, [panel]: OnOff.on})
	}

	panelClose(panel :Panel) {
		let action = {
			[panel]: OnOff.off
		}
		if (panel === Panel.three) {
			action[Panel.two] = OnOff.on
		}
		this.panelsOnOffSubject.next({...this.panelsOnOff, ...action})
	}
}
