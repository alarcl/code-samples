<?php

namespace app\modules\oapi;


class Routes implements \yii\base\BootstrapInterface {

	public function bootstrap($app) {
		\Yii::$app->getUrlManager()->addRules([
			'OPTIONS /oapi/<any:.+>' => '/oapi/common/options',

			'GET /oapi/versions' => '/oapi/common/get-versions',

			// users
			'GET /oapi/users/send-login-link-by-email/<id:\d+>' => '/oapi/users/send-login-link-by-email',
			'GET /oapi/users/current' => '/oapi/users/get-current',
			'GET /oapi/users/<id:\d+>' => '/oapi/users/get-one',
			'GET /oapi/users/<query:.+>' => '/oapi/users/select',
			'POST /oapi/users' => '/oapi/users/save',

			// autocomplete
			'GET /oapi/autocomplete/users/<str:.+>' => '/oapi/common/get-user-list',
			'GET /oapi/autocomplete/addresses/<str:.+>' => '/oapi/common/get-address-list',

			// orders
			'GET /oapi/orders/file' => '/oapi/orders/get-file',
			'GET /oapi/orders/<id:\d+>' => '/oapi/orders/get-one',
			'GET /oapi/orders/<query:.+>' => '/oapi/orders/select',
			'POST /oapi/orders' => '/oapi/orders/save',
		], false);
	}

}
