import { Injectable } from '@angular/core'
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'

import { tap } from 'rxjs/operators'

import { environment } from '../environments/environment'

import { User } from './user.type'


@Injectable()
export class ConfigService {
	private _apiKey :string
	private _currentUser :User
	private _error :HttpErrorResponse

	constructor(private http :HttpClient) {}

	get apiKey() :string {
		return this._apiKey
	}

	get currentUser() :User {
		return this._currentUser
	}

	get error() {
		return this._error
	}
	set error(e) {
		this._error = e
	}

	initApiKey(apiKey :string = undefined) :Promise<string|null> {
		return new Promise<string|null>((resolve, reject) => {
			let searchParams = new HttpParams({
				fromString: window.location.search.slice(1)
			})

			if (apiKey !== undefined) {
				if (!apiKey) {
					localStorage.removeItem('api-key')
				} else {
					this._apiKey = apiKey
					localStorage.setItem('api-key', this._apiKey)
				}
			} else if (searchParams.has('api-key')) {
				this._apiKey = searchParams.get('api-key')

				localStorage.setItem('api-key', this._apiKey)

				searchParams = searchParams.delete('api-key')
				const search = searchParams.keys().length ? `?${searchParams.toString()}` : ''
				history.replaceState(null, null, `${window.location.origin}${window.location.pathname}${search}`)
			} else {
				this._apiKey = localStorage.getItem('api-key')
			}

			if (!this._apiKey) {
				reject('Не задан api-key')
			}

			resolve(this._apiKey)
		})
	}

	initCurrentUser() :Promise<User> {
		return this.http.get<User>(`${environment.apiUrl}/users/current`).pipe(
			tap((user: User) => {
				this._currentUser = user
			})
		).toPromise()
	}
}
