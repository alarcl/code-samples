
(function() {
'use strict';

angular.module('ProjectEventsApp', ['ngTouch', 'ui.bootstrap'])
.constant('php_script', 'projectevents.php')
.factory('locationSearch', function() {
	//https://developer.mozilla.org/ru/docs/Web/API/URLUtils.search
	return new (function (sSearch) {
		if (sSearch.length > 1) {
			for (var aItKey, nKeyId = 0, aCouples = sSearch.substr(1).split("&"); nKeyId < aCouples.length; nKeyId++) {
				aItKey = aCouples[nKeyId].split("=");
				this[decodeURIComponent(aItKey[0])] = aItKey.length > 1 ? decodeURIComponent(aItKey[1]) : "";
			}
		}
	})(window.location.search);
})
.factory('geolocation', ['$window', '$q', function($window, $q) {
	return {
		getCurrentPosition: function(options) {
			var deferred = $q.defer();
			if ('geolocation' in $window.navigator) {
				$window.navigator.geolocation.getCurrentPosition(function(position) {
					deferred.resolve(position);
				}, function(error) {
					deferred.reject({
						error: error
					});
				}, options);
			} else {
				deferred.reject({
					error: {
						code: 2,
						message: 'В этом браузере нет поддержки определения местоположения' // have no geolocation support
					}
				});
			}
			return deferred.promise;
		}
	};
}])
.factory('ProjectEvents', ['$http', '$q', 'php_script', 'locationSearch', 'geolocation', function($http, $q, php_script, locationSearch, geolocation) {
	return {
		getEventUser: function() {
			if ('uid' in locationSearch) {
				return $http.get(php_script, {
					params: {
						uid: locationSearch.uid
					}
				});
			} else {
				return $q.reject({data: {}});
			}
		},
		getNearestProjects: function() {
			return geolocation.getCurrentPosition({
				enableHighAccuracy: true
				//,timeout: 120000
				//,maximumAge: 300000
			}).then(function(position) {
				return $http.get(php_script, {
					params: {
						uid: locationSearch.uid,
						latitude: position.coords.latitude,
						longitude: position.coords.longitude
					}
				});
			}, function(error) {
				return $q.reject(error);
			});
		},
		addProjectEvent: function(form_data) {
			return $http.post(php_script, form_data, {
				transformRequest: angular.identity,
				headers: {
					'Content-Type': undefined
				}
			});
		}
	};
}])
.directive('thisElement', ['$parse', function($parse) {
	return {
		restrict: 'A',
		link: function(scope, elm, attrs) {
			$parse(attrs.thisElement).assign(scope, elm[0]);
		}
	};
}])
.directive('multiFile', ['$compile', '$parse', function($compile, $parse) {
	return {
		restrict: 'A',
		scope: {
			multiFile: '='
		},
		link: function(scope, elem, attrs) {
			elem.bind('change', function() {
				if (elem[0].files.length > 0) {
					scope.multiFile.push(elem);
					elem.unbind('change');

					var new_input = $compile(elem.parent().wrap('<div>').parent().html())(scope.$parent);
					elem.parent().after(new_input);
				}
			});
		}
	};
}])
.controller('ProjectEventsCtrl', ['$scope', 'ProjectEvents', 'locationSearch', function($scope, ProjectEvents, locationSearch) {
	$scope.file_inputs = [];
	$scope.current_event = {};
	$scope.state = {
		show_form: false,
		use_camera: true,
		project: {
			searching: true,
			found: false
		}
	};

	ProjectEvents.getEventUser().then(function(data) {
		$scope.user_data = data.data;
		$scope.current_event.event = $scope.user_data.Events[0];
		$scope.events_by_3 = chunk($scope.user_data.Events, 3, {hide: true});

		$scope.state.show_form = true;

		if ($scope.user_data.Project === 0) {
		// если пользователю не задан проект в 1С то запрашиваем геопозицию и получаем близлежащие проекты
		// if no project set for current user then find nearest project via geolocation
			ProjectEvents.getNearestProjects().then(function(data) {
				$scope.nearest_projects = data.data;

				// устанавливаем номер проекта
				// set project id
				//  if ($scope.nearest_projects.NearestProject.length === 1 && !$scope.project_id) {
				// 	 $scope.project_id = $scope.nearest_projects.NearestProject[0].ProjectID;
				//  }

				$scope.state.project.found = true;
				$scope.state.project.searching = false;
			}, function(data) {
				$scope.state.project.searching = false;
			});
		} else {
		// если пользователю задан проект
		// if project id is set for current user
			$scope.project_id = $scope.user_data.Project;
		}

		// разбиваем массив на массивы по len элементов дополняя элементом elem
		// нужно для вывода кнопок (с типами событий) по 3 в строку
		// divide the array into arrays by len elements and complementing by elem element
		// it is need for display buttons (with event types) 3 per line
		function chunk(arr, len, elem) {
			var chunks = [],
				i = 0,
				n = arr.length;
			while (i < n) {
				chunks.push(arr.slice(i, i += len));
			}
			var n = chunks[chunks.length-1].length,
				need = len - n,
				elem = elem || {};
			while (need--) {
				chunks[chunks.length-1].push(Object.create(elem));
			}
			return chunks;
		}
	}, function(data) {
	});

	$scope.send = function() {
		$scope.state.show_form = false;
		$scope.state.uploading = true;

		var fd = new FormData($scope.project_events_form)
		fd.append("event_id", $scope.current_event.event.EventId);
		fd.append("uid", locationSearch.uid);

		var file_count = 0;
		$scope.file_inputs.forEach(function(file_input) {
			file_count += file_input[0].files.length;
		});
		fd.append("file_count", file_count);

		ProjectEvents.addProjectEvent(fd).then(function(data) {
			// сброс полей формы
			// form fields reset
			// $scope.project_events_form.reset();
			$scope.file_inputs.forEach(function(file_input) {
				file_input.parent().remove();
			});
			$scope.file_inputs = [];

			$scope.comment = undefined;
			if ($scope.user_data.Project === 0) {
				$scope.project_id = undefined;
			}

			$scope.state.result = data.data;
			$scope.state.response_desc = 'Событие зарегистрировано. Регистрационный код: '+$scope.state.result.RegCode; // event registered

			$scope.state.uploading = false;
		}, function(data) {
			$scope.state.result = data.data;
			$scope.state.response_desc = 'Ошибка. Сообщите о проблеме тел. x (xxx) xxx-xx-xx'; // error description

			$scope.state.uploading = false;
		});
	};

	$scope.setProjectId = function($event) {
		var scope = angular.element($event.target).scope();
		$scope.project_id = scope.project.ProjectID;
	};
}]);

})();