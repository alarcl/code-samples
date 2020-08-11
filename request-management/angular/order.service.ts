import { Injectable } from '@angular/core'
// import { Location } from '@angular/common'
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http'

import { Observable, ReplaySubject } from 'rxjs'
import { map, tap } from 'rxjs/operators'

import { environment } from '../environments/environment'

import { ConfigService } from './config.service'

import { OrderListItem, OrderList, Order, OrderSave } from './order.type'


export interface SelectParams {
	page ?:{index :number, size :number}
	orderBy ?:{[column :string] :'asc'|'desc'}
	menu ?:string
	fulltext ?:string
	filter ?:string
}


@Injectable({
	providedIn: 'root'
})
export class OrderService {
	constructor(
		private http :HttpClient,
		private cfg :ConfigService
	) {}

	private orderSubject = new ReplaySubject<Order>(1)

	// orderLoading = false
	orderChange = this.orderSubject.asObservable()

	select(select :SelectParams) :Observable<OrderList> {
		return this.http.get<OrderList>(`${environment.apiUrl}/orders/${encodeURIComponent(JSON.stringify(select))}`)
	}

	get(id :number) :Observable<Order> {
		const iOSDate = (isoDate :any) :string => {
			return isoDate.replace(/-/g, '/').replace('T', ' ')
		}

		this.orderSubject.next(null)
		return this.http.get<Order>(`${environment.apiUrl}/orders/${id}`).pipe(
			map(order => {
				order.statusDate = order.statusDate ? new Date(iOSDate(order.statusDate)) : null
				order.gradeDate = order.gradeDate ? new Date(iOSDate(order.gradeDate)) : null
				order.deadline = order.deadline ? new Date(iOSDate(order.deadline)) : null
				order.createTime = order.createTime ? new Date(iOSDate(order.createTime)) : null
				order.commentDate = order.commentDate ? new Date(iOSDate(order.commentDate)) : null

				if (order.geoObject) {
					order.geoObject.createTime = order.geoObject.createTime ? new Date(iOSDate(order.geoObject.createTime)) : null
					order.geoObject.updateTime = order.geoObject.updateTime ? new Date(iOSDate(order.geoObject.updateTime)) : null
				}

				return order
			}),
			tap(order => {
				this.orderSubject.next(order)
			})
		)
	}

	save(orderSave :OrderSave) :Observable<Order> {
		let order = {...orderSave}

		if (order.deadline) {
			order.deadline.setUTCFullYear(order.deadline.getFullYear(), order.deadline.getMonth(), order.deadline.getDate())
			order.deadline.setUTCHours(0, 0, 0, 0)
		}

		if (order.applicant) {
			order.applicantId = order.applicant ? order.applicant.id : null
			delete order.applicant
		}
		if (order.employee) {
			order.employeeId = order.employee ? order.employee.id : null
			delete order.employee
		}

		if (order.accessUsers) {
			order.access = []
			for (let user of order.accessUsers) {
				order.access.push(user.id)
			}
			delete order.accessUsers
		}

		const files = (({orderFiles, commentFiles}) => ({orderFiles, commentFiles}))(order)
		delete order.orderFiles
		delete order.commentFiles

		let formData = new FormData()
		formData.append('body', JSON.stringify(order))
		// файлы
		Array.from(files.orderFiles || []).forEach(f => {
			formData.append('orderFiles[]', f)
		})
		Array.from(files.commentFiles || []).forEach(f => {
			formData.append('commentFiles[]', f)
		})

		return this.http.post<Order>(`${environment.apiUrl}/orders`, formData).pipe(
			tap(order => {
				this.orderSubject.next(order)
			})
		)
	}

	autocompleteAddress(value :string) :Observable<String[]> {
		return this.http.get<String[]>(`${environment.apiUrl}/autocomplete/addresses/${encodeURIComponent(value)}`)
	}

	getFileLink(name :string, oid :number, hid :number = null, tbnl :boolean = null) :string {
		let params = new HttpParams({fromObject: {
			'api-key': this.cfg.apiKey,
			name: name,
			oid: String(oid),
			hid: String(hid),
			tbnl: String(Number(tbnl))
		}})
		return `${environment.apiUrl}/orders/file?${params}`
	}
}
