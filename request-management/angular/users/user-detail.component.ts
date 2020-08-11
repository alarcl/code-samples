import { Component, OnInit } from '@angular/core'
import { Location } from '@angular/common'
import { ActivatedRoute } from '@angular/router'
import { FormControl, FormGroup } from '@angular/forms'

import { Observable } from 'rxjs'
import { catchError, debounceTime, distinctUntilChanged, filter, finalize, map, switchMap, tap } from 'rxjs/operators'

import { MatSnackBar } from '@angular/material/snack-bar'

import { Panel, PanelStateService } from '../panel-state.service'
import { UserService } from '../user.service'
import { User, userRoles } from '../user.type'
import { isUserObjectValidator } from '../is-user-object.validator'


@Component({
	selector: 'app-user-detail',
	templateUrl: './user-detail.component.html',
	styleUrls: ['./user-detail.component.css']
})
export class UserDetailComponent implements OnInit {
	constructor(
		private route :ActivatedRoute,
		private location :Location,
		private snackBar: MatSnackBar,
		private userService :UserService,
		public panels :PanelStateService
	) {}

	Panel = Panel

	userRoles = userRoles

	user :User
	isLoading :boolean

	userForm :FormGroup = new FormGroup({
		access: new FormControl({value: null, disabled: false}),
		approved: new FormControl({value: null, disabled: false}),
		role: new FormControl({value: null, disabled: true}),
		name: new FormControl({value: null, disabled: true}),
		email: new FormControl({value: null, disabled: true}),
		phone: new FormControl({value: null, disabled: true}),
		position: new FormControl({value: null, disabled: true}),
		director: new FormControl({value: null, disabled: true}, isUserObjectValidator),
	})

	editingFields :Map<string, any> = new Map()
	savingFields :Set<string> = new Set()

	autocompleteDirectors :User[]

	loginLink :string

	ngOnInit() {
		this.route.paramMap.pipe(
			tap(() => this.isLoading = true),
			map(params => Number(params.get('id'))),
			switchMap(id => this.userService.get(id)),
			tap(() => this.isLoading = false)
		).subscribe((u :User) => {
			this.user = u
			this.userForm.patchValue(this.user)

			if (this.user.apiKey) {
				this.loginLink = `${window.location.origin}${this.location.prepareExternalUrl('?api-key='+this.user.apiKey)}`
			}
		})

		// выпадающие списки
		this.userForm.get('director').valueChanges.pipe(
			filter((value :string) => value && value.length > 1),
			debounceTime(500),
			distinctUntilChanged(),
			switchMap((value :string) => {
				return this.userService.autocomplete(value)
			})
		).subscribe((users :User[]) => {
			this.autocompleteDirectors = users
		})
	}

	closeInfo() {
		this.panels.panelClose(Panel.two)
	}

	startEditField(field :string) {
		this.editingFields.set(field, this.userForm.get(field).value)
		this.userForm.get(field).enable()
	}

	cancelEditField(field :string) {
		if (this.userForm.get(field).value !== this.editingFields.get(field)) {
			this.userForm.get(field).setValue(this.editingFields.get(field))
		}

		this.editingFields.delete(field)
		this.userForm.get(field).disable()
	}

	save(field :string) {
		this.savingFields.add(field)
		return this.userService.save({
			id: this.user.id,
			[field]: this.userForm.get(field).value
		}).pipe(
			catchError((err) => {
				this.snackBar.open(err.error.message, 'OK')
				this.cancelEditField(field)
				throw err
			}),
			finalize(() => {
				this.savingFields.delete(field)
			})
		)
	}

	saveField(field :string) {
		if (this.userForm.get(field).value !== this.editingFields.get(field)) {
			this.save(field).subscribe({
				error: () => {
					this.editingFields.delete(field)
				},
				complete: () => {
					this.editingFields.delete(field)
				}
			})
		}
		this.userForm.get(field).disable()
	}

	saveCheckbox(checkbox :string) {
		this.save(checkbox).subscribe()
	}

	sendLoginLink() {
		this.userService.sendLoginLink(this.user.id, this.loginLink).subscribe(sended => {
			const msg = sended ? 'Письмо успешно отправлено' : 'Сбой при отправке'
			this.snackBar.open(msg, '', {duration: 2000})
		})
	}

	autocompleteDirectorDisplayWithFn(user :User) {
		if (user) {
			return user.name
		}
	}
}
