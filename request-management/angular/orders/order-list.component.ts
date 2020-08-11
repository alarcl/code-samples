import { Component, OnInit, ViewChild } from '@angular/core'
import { FormControl } from '@angular/forms'
import { ActivatedRoute, ActivationEnd, Router } from '@angular/router'

import { CollectionViewer, DataSource } from '@angular/cdk/collections'
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling'

import { EMPTY, Observable, timer, BehaviorSubject, Subscription } from 'rxjs'
import { distinctUntilChanged, map, startWith, switchMap, tap, filter, debounce } from 'rxjs/operators'

import { OrderService, SelectParams } from '../order.service'
import { OrderList, OrderListItem, orderGradeLabel, OrderStatus, orderStatusLabel, Comment } from '../order.type'
import { PanelStateService, Panel } from '../panel-state.service'


@Component({
	selector: 'app-order-list',
	templateUrl: './order-list.component.html',
	styleUrls: ['./order-list.component.css']
})
export class OrderListComponent implements OnInit {
	constructor(
		private router :Router,
		private route :ActivatedRoute,
		private orderService :OrderService,
		private panels :PanelStateService
	) {
		this.paramOrderIdChange$.subscribe(id => {
			this.currentOrderId = id
		})
	}

	@ViewChild(CdkVirtualScrollViewport, {static: true}) virtualScrollViewport :CdkVirtualScrollViewport

	orderGradeLabel = orderGradeLabel
	OrderStatus = OrderStatus
	orderStatusLabel = orderStatusLabel

	filter = new FormControl()

	ordersDataSource :OrdersDataSource

	currentOrderId :number

	filterChange$ :Observable<string> = this.filter.valueChanges.pipe(
		debounce(v => v ? timer(2000) : EMPTY),
		distinctUntilChanged(),
		map(v => {
			let f = v ? {fulltext: v} : {menu: 'employee'}
			return JSON.stringify(f)
		})
	)

	paramSearchChange$ :Observable<SelectParams> = this.route.paramMap.pipe(
		map(params => JSON.parse(params.get('search')))
	)

	paramOrderIdChange$ :Observable<number> = this.router.events.pipe(
		filter(event =>
			event instanceof ActivationEnd
			&& !!event.snapshot.url.length
			&& event.snapshot.outlet === 'detail'
			&& event.snapshot.url[0].path === 'order'
		),
		map((ae :ActivationEnd) => Number(ae.snapshot.params['id']))
	)

	ngOnInit() {
		this.filterChange$.subscribe(search => {
			this.router.navigate(['orders', search])
		})

		this.paramSearchChange$.subscribe(search => {
			this.ordersDataSource = new OrdersDataSource(this.orderService, search)
			this.virtualScrollViewport.scrollTo({top: 0})
		})
	}

	navigateDetail(id :number) {
		this.router.navigate([{outlets: {detail: ['order', id]}}])
		this.panels.panelOpen(Panel.two)
	}

	trackByOrders(i :number, order :OrderListItem) :number {
		// return order.id // не подходит, во сремя прокрутки order запрашивается и не инициализирован
		// return i
		return order ? order.id : null
	}

	orderExpired(order :OrderListItem) {
		let expired = false
		if (order.deadline && ![OrderStatus.complete, OrderStatus.cancel].includes(order.status)) {
			// let dt = (<any>order.deadline).replace(/-/g, '/').replace('T', ' ')
			// let deadline = new Date(dt)
			const now = new Date()
			if (order.deadline < now) {
				expired = true
			}
		}
		return expired
	}
}


export class OrdersDataSource extends DataSource<OrderListItem | undefined> {
	constructor(
		private orderService :OrderService,
		private select :SelectParams
	) {
		super()
		this.fetchPage(0)
	}

	private pageSize = 50
	private cachedData = []
	private fetchedPages = new Set<number>()

	// public isLoading = new BehaviorSubject<boolean>(true)
	public isLoading2 = true
	private dataStream = new BehaviorSubject<(OrderListItem | undefined)[]>([])
	private subscription = new Subscription()

	connect(collectionViewer :CollectionViewer) :Observable<(OrderListItem | undefined)[]> {
		this.subscription.add(collectionViewer.viewChange.subscribe(range => {
			const startPage = this.getPageForIndex(range.start)
			const endPage = this.getPageForIndex(range.end - 1)
			for (let i = startPage; i <= endPage; i++) {
				this.fetchPage(i)
			}
		}))
		return this.dataStream
	}

	disconnect() :void {
		this.subscription.unsubscribe()
	}

	private getPageForIndex(index :number) :number {
		return Math.floor(index / this.pageSize)
	}

	private fetchPage(page :number) :void {
		if (this.fetchedPages.has(page)) {
			return
		}
		this.fetchedPages.add(page)

		// this.isLoading.next(true)
		this.isLoading2 = true

		// const select = Object.assign({}, this.select, { page: { index: page, size: this.pageSize } })
		const select = {
			...this.select,
			page: { index: page, size: this.pageSize }
		}
		this.orderService.select(select).subscribe(v => {
			// this.isLoading.next(false)
			this.isLoading2 = false

			if (!this.cachedData.length) {
				this.cachedData = Array.from<OrderListItem>({ length: v.totalCount })
			}

			this.cachedData.splice(
				page * this.pageSize,
				this.pageSize,
				...v.items
			)

			this.dataStream.next(this.cachedData)
		})
	}
}
