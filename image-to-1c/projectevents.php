<?php

// $projectevents_ws = 'http://localhost/documentco/ws/projectevents.1cws?wsdl';
$projectevents_ws = 'http://xx.xxx.xx.xx/documentco/ws/projectevents.1cws?wsdl';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['uid'])) {

	if (isset($_GET['latitude']) && isset($_GET['longitude'])) {
	// запрос информации о близлежащих проектах
	// query nearest projects
		try {
			$client = new SoapClient($projectevents_ws, [
				'login'=>'x',
				'password'=>'x',
				'cache_wsdl'=>WSDL_CACHE_NONE
			]);

			$nearest_projects = $client->GetNearestProjects(['UserKey' => $_GET['uid'], 'Latitude' => $_GET['latitude'], 'Longitude' => $_GET['longitude']])->return;
		} catch (SoapFault $sf) {
			http_response_code(418);
			echo($sf->getMessage());
			exit();
		}

		if (!isset($nearest_projects->NearestProject)) {
			http_response_code(418);
			// фикс ошибки: веб-сервис 1С возвращает объект вместо массива если в массиве один элемент
			// error fix
			if (!is_array($nearest_projects->Response)) {
				$iserror = 		$nearest_projects->Response->IsError;
				$description = 	$nearest_projects->Response->Description;

				$nearest_projects->Response = [['IsError' => $iserror, 'Description' => $description]];
			}
			echo(json_encode($nearest_projects));
			exit();
		}

		// фикс ошибки: веб-сервис 1С возвращает объект вместо массива если в массиве один элемент
		// error fix
		if (!is_array($nearest_projects->NearestProject)) {
			$project_id = $nearest_projects->NearestProject->ProjectID;
			$project_description = $nearest_projects->NearestProject->Description;
			$project_distance = $nearest_projects->NearestProject->Distance;

			$nearest_projects->NearestProject = [['ProjectID' => $project_id, 'Description' => $project_description, 'Distance' => $project_distance]];
		}

		echo(json_encode($nearest_projects));
	} else {
	// запрос информации по пользователю
	// query user info
		try {
			$client = new SoapClient($projectevents_ws, [
				'login'=>'x',
				'password'=>'x',
				'cache_wsdl'=>WSDL_CACHE_NONE
			]);

			$event_user = $client->GetEventUser(['UserKey' => $_GET['uid']])->return;
		} catch (SoapFault $sf) {
			http_response_code(418);
			echo($sf->getMessage());
			exit();
		}

		if (!isset($event_user->Project)) {
			http_response_code(418);
			echo('Пользователь не найден');
			exit();
		}

		// фикс ошибки: веб-сервис 1С возвращает объект вместо массива если в массиве один элемент
		// error fix
		if (isset($event_user->Events) && !is_array($event_user->Events)) {
			if (!isset($event_user->Events->EventId)) {
				http_response_code(418);
				echo('Нет ни одного типа события ассоцированного с данным пользователем');
				exit();
			}

			$event_id 	= $event_user->Events->EventId;
			$event_name = $event_user->Events->EventName;
			$event_desc = $event_user->Events->EventDescription;

			$event_user->Events = [['EventName' => $event_name, 'EventId' => $event_id, 'EventDescription' => $event_desc]];
		}

		echo(json_encode($event_user));
	}

}

// отправка события (событие, фото, комментарий)
// send event
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

	$answer = [
		'Response' => []
	];

	// закомментировано - разрешено добавление сообщений без фотографий
	//  if ($_FILES['photos']['error'][0] === 4) {
	// 	 $answer['Response'][] = ['IsError'=>true, 'Description'=>'Не выбрано ни одного файла'];
	// 	 http_response_code(418);
	// 	 echo(json_encode($answer));
	// 	 exit();
	//  }

	if (!isset($_POST['project_id']) || empty($_POST['project_id']) || !is_numeric($_POST['project_id'])) {
		$answer['Response'][] = ['IsError'=>true, 'Description'=>'Номер проекта не заполнен или содержит не цифры'];
		http_response_code(418);
		echo(json_encode($answer));
		exit();
	}
	if (!isset($_POST['comment']) || empty($_POST['comment'])) {
		$answer['Response'][] = ['IsError'=>true, 'Description'=>'Сообщение не заполнено'];
		http_response_code(418);
		echo(json_encode($answer));
		exit();
	}


	$finfo = new finfo(FILEINFO_MIME_TYPE);

	$TableImage_photos = [];
	foreach ($_FILES['photos']['name'] as $file_num=>$file_name) {
		if ($_FILES['photos']['error'][$file_num] !== 0 || empty($file_name)) {
			continue;
		}

		// проверка на изображение
		// check image
		if ($finfo->file($_FILES['photos']['tmp_name'][$file_num]) != 'image/jpeg') {
			$answer['Response'][] = ['IsError'=>true, 'Description'=>'Файл '.$file_name.' не является изображением JPEG'];
			continue;
		}

		$TableImage_photos[] = [
			'ImageName'=>$file_name
			,'ImageBinary'=>fread(fopen($_FILES['photos']['tmp_name'][$file_num],'r'),filesize($_FILES['photos']['tmp_name'][$file_num]))
		];
	}

	// закомментировано - разрешено добавление сообщений без фотографий
	//  if (!isset($TableImage_photos[0])) {
	// 	 $answer['Response'][] = ['IsError'=>true, 'Description'=>'Нет изображений для загрузки'];
	// 	 http_response_code(418);
	// 	 echo(json_encode($answer));
	// 	 exit();
	//  }

	// soap
	try {
		$client = new SoapClient($projectevents_ws, [
			'login'=>'x',
			'password'=>'x',
			'cache_wsdl'=>WSDL_CACHE_NONE
		]);

		$AddProjectEventResult = $client->AddProjectEvent([
			'UserKey' => 			$_POST['uid']
			,'Project' => 			$_POST['project_id']
			,'Event' => 			$_POST['event_id']
			,'Comment' => 			$_POST['comment']
			,'FileCount' =>			$_POST['file_count']
			,'TableImage_photos' => isset($TableImage_photos[0]) ? $TableImage_photos : null
		])->return;
	} catch (SoapFault $sf) {
		$answer['Response'][] = ['IsError'=>true, 'Description'=>$sf->getMessage()];
		http_response_code(418);
		echo(json_encode($answer));
		exit();
	}

	if (!isset($AddProjectEventResult->Response)) {
		$AddProjectEventResult->Response = [];
	} else {
		// фикс ошибки: веб-сервис 1С возвращает объект вместо массива если в массиве один элемент
		if (!is_array($AddProjectEventResult->Response)) {
			$iserror = 		$AddProjectEventResult->Response->IsError;
			$description = 	$AddProjectEventResult->Response->Description;

			$AddProjectEventResult->Response = [['IsError' => $iserror, 'Description' => $description]];
		}
	}
	foreach ($answer["Response"] as $key => $value) {
		$AddProjectEventResult->Response[] = ['IsError'=>$value['IsError'], 'Description'=>$value['Description']];
	}

	// если сообщения были отправлены до инициализации регкода то отправляем их в error
	if (!isset($AddProjectEventResult->RegCode)) {
		http_response_code(418);
	}

	echo(json_encode($AddProjectEventResult));
}
