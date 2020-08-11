import { Injectable } from '@angular/core'
import { HTTP_INTERCEPTORS, HttpInterceptor, HttpHandler, HttpRequest, HttpEvent } from '@angular/common/http'

import { Observable } from 'rxjs'

import { ConfigService } from './config.service'
import { environment } from '../environments/environment'


@Injectable()
export class ApikeyInterceptor implements HttpInterceptor {
	constructor(private cfg :ConfigService) {}

	intercept(req :HttpRequest<any>, h :HttpHandler) :Observable<HttpEvent<any>> {
		if (req.url.includes(environment.apiUrl) && this.cfg.apiKey) {
			let reqA = req.clone({
				headers: req.headers.set('X-Api-Key', this.cfg.apiKey)
			})
			return h.handle(reqA)
		}

		return h.handle(req)
	}
}
