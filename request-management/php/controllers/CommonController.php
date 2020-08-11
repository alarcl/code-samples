<?php

namespace app\modules\oapi\controllers;


class CommonController extends \yii\web\Controller
{
	public function behaviors() {
		return [
			'corsFilter' => [
				'class' => \app\modules\oapi\components\Cors::className(),
			],
			'headerAuth' => [
				'class' => \app\modules\oapi\components\HttpHeaderAuth::className(),
			],
			'verbFilter' => [
				'class' => \yii\filters\VerbFilter::className(),
				'actions' => [
					'options' => ['options'],
					'get-address-list' => ['get'],
					'get-user-list' => ['get']
				],
			],
			'access' => [
				'class' => \yii\filters\AccessControl::className(),
				'rules' => [
					[
						'allow' => true,
						'roles' => ['@']
					]
				]
			]
			// 'contentJSON' => [
			// 	'class' => \yii\filters\ContentNegotiator::className(),
			// 	'formats' => [
			// 		'application/json' => \yii\web\Response::FORMAT_JSON,
			// 	],
			// 	// 'except' => ['index']
			// ]
		];
	}

	// заглушка для method=options
	public function actionOptions() {}

	// поиск по строке адресов для выпадающих списков
	// ищутся все адреса без ограничений (если у текущего пользователя проставлен approved)
	public function actionGetAddressList($str) {
		if (strlen($str) <= 1) {
			return [];
		}

		$sql = "
			select distinct address
			from tbl_order
			where address like :filter
			limit 50
		";
		$params = [":filter" => "%{$str}%"];

		$addresses = \Yii::$app->db->createCommand($sql, $params)->queryColumn();

		return $addresses;
	}

	// поиск по строке (имя/email) для выпадающих списков
	// ищутся все пользователи без ограничений (если у текущего пользователя проставлен approved)
	public function actionGetUserList($str) {
		if (strlen($str) <= 1) {
			return [];
		}

		$users = [];

		if (\Yii::$app->user->identity->approved) {
			$sql = "
				select distinct
					id,
					name,
					email,
					phone,
					position
				from tbl_user
				where 
					access = 1
					and concat(name, ' <', email, '>') like :filter
			";
			$params = [':filter' => "%{$str}%"];

			$users = \Yii::$app->db->createCommand($sql, $params)->queryAll();
			foreach ($users as &$user) {
				$user['id'] = (int)$user['id'];
			}
		}

		return $users;
	}

	public function actionGetVersions() {
		return [
			'mysql' => \Yii::$app->db->getSlavePdo()->getAttribute(\PDO::ATTR_SERVER_VERSION),
			'php' => phpversion()
		];
	}
}
