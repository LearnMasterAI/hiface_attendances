odoo.define('hr_attendance.my_attendances', function (require) {
"use strict";
var AbstractAction = require('web.AbstractAction');
var core = require('web.core');
var field_utils = require('web.field_utils');


var MyAttendances = AbstractAction.extend({
    contentTemplate: 'HrAttendanceMyMainMenu',
    events: {
        "click .o_hr_attendance_sign_in_out_icon": _.debounce(function() {
            this.update_attendance();
        }, 200, true),
    },

    willStart: function () {
        var self = this;
        var def = this._rpc({
                model: 'hr.employee',
                method: 'search_read',
                args: [[['user_id', '=', this.getSession().uid]], ['attendance_state', 'name', 'hours_today']],
            })
            .then(function (res) {
                self.employee = res.length && res[0];
                if (res.length) {
                    self.hours_today = field_utils.format.float_time(self.employee.hours_today);
                }
            });

        return Promise.all([def, this._super.apply(this, arguments)]);
    },

    update_attendance: function () {
        var currentPage = history.length;
        var self = this

        // function giúp lấy base64 từ thành phần jQuery
        function getBase64AndResize (image) {
            var MAX_HEIGHT = 100;
            let canvas = $(document.createElement('canvas'))
            let ctx = canvas[0].getContext("2d");
            if (image.height() > MAX_HEIGHT) {
                canvas.css('height', MAX_HEIGHT);
                canvas.css('width', canvas.height() * image.width() / image.height());
            } else {
                canvas.css('width', image.width());
                canvas.css('height', image.height());
            }

            ctx.drawImage(image[0], 0, 0, canvas.width(), canvas.height());

            let dataURL = canvas[0].toDataURL();
            dataURL = dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
            return dataURL;
        }

        // Hàm này giúp tạo ra một thread
        function executeAsync(func) {
            setTimeout(func, 0);
            return func;
        }

        // Đóng gói JSON
        function packJsonApiCompare (base64ImageCapture) {
            let pack = {}, target1 = {}, target2 = {};

            target1["photoFormat"] = "image/jpeg";
            target1["photoData"] = base64ImageCapture;
            target1["faceLocator"] = null;

            target2["photoFormat"] = "image/jpeg";
            target2["photoData"] = base64ImageOriginalUser;
            target2["faceLocator"] = null;

            pack["target1"] = target1;
            pack["target2"] = target2;
            pack["threshold"] = 0;
            return pack;
        }

        function packJsonApiLive (base64ImageCapture) {
            let pack = {}, analyzeOptions = {}, attributeTypes = {}, qualityCheckOptions = {};

            attributeTypes["age"] = false;
            attributeTypes["blurriness"] = false;
            attributeTypes["eyeStatus"] = false;
            attributeTypes["gender"] = false;
            attributeTypes["liveness"] = true;
            attributeTypes["minority"] = false;
            attributeTypes["mouthStatus"] = false;
            attributeTypes["pose"] = false;
            attributeTypes["quality"] = false;

            qualityCheckOptions["scenario"] = "CAPTURE";

            analyzeOptions["attributeTypes"] = attributeTypes;
            analyzeOptions["qualityCheckOptions"] = qualityCheckOptions;
            analyzeOptions["extractFeature"] = true;
            analyzeOptions["extractLandmark"] = true;

            pack["analyzeOptions"] = analyzeOptions;
            pack["photoData"] = base64ImageCapture;
            return pack;
        }

        // Lấy ảnh người dùng gốc
        // Ảnh người dùng gốc --> Base64 người dùng gốc
        var image_user = $("#david_wu_image_original_user");
        var base64ImageOriginalUser = getBase64AndResize(image_user);

        // My code
        // Ẩn khung dữ liệu
        $(".o_hr_attendance_kiosk_mode.david_wu_hide").hide();

        // Hiện khung xác thực
        $(".david_wu_camera").css('display', 'flex');


        ///////////////////////////////// Kết nối camera /////////////////////////////////////
        var video = $(".david_wu_camera_video");
        var mediaConfig = {
            video: true
        };
        var errBack = function(e) {
            console.log('An error has occurred!', e)
        };

        // Put video listeners into place
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia(mediaConfig).then(function(stream) {
                //video.src = window.URL.createObjectURL(stream);
                video[0].srcObject = stream;
                video[0].play();
            });
        }

        /* Legacy code below! */
        else if (navigator.getUserMedia) { // Standard
            navigator.getUserMedia(mediaConfig, function(stream) {
                video[0].src = stream;
                video[0].play();
            }, errBack);
        } else if (navigator.webkitGetUserMedia) { // WebKit-prefixed
            navigator.webkitGetUserMedia(mediaConfig, function(stream) {
                video[0].src = window.webkitURL.createObjectURL(stream);
                video[0].play();
            }, errBack);
        } else if (navigator.mozGetUserMedia) { // Mozilla-prefixed
            navigator.mozGetUserMedia(mediaConfig, function(stream) {
                video[0].src = window.URL.createObjectURL(stream);
                video[0].play();
            }, errBack);
        }

        function closeCamera() {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                video[0].srcObject.getTracks().forEach(function(track) {
                    track.stop();
                });
            }

            /* Legacy code below! */
            else {
                video[0].stop();
            }
        }
        ///////////////////////////////// Kết nối camera /////////////////////////////////////

        $('body').bind('onhashchange',function(){
            count = MAX_NUMBER_OF_LOOP;
        });

        $(".david_wu_text").text("Bắt đầu quá trình xác thực ...");

//        $("#snap").click(function() {
//            let base64ImageCapture = getBase64AndResize(video);
//            console.log(base64ImageCapture);
//        });

        // Quá trình xác thực send dữ liệu lên Server
        var TIME_PER_LOOP = 1000;

        // Số lượng lần xác thực
        var MAX_NUMBER_OF_LOOP = 20; // Điều kiện bắt buộc dừng
        var count = 0;

        var davidWuCompareLoop = setInterval(
            compareLoop, TIME_PER_LOOP
        );

        var davidWuLiveLoop;

        function compareLoop() {
            // Chạy một thread
                let timer = executeAsync(function() {
                // 0. Chụp ảnh người dùng
                let base64ImageCapture = getBase64AndResize(video);
                // 1. Chạy hàm đóng gói JSON
                let jsonRequest = packJsonApiCompare(base64ImageCapture);

                let myUrlCompare = "http://113.20.108.65:8080/v4/query/verify";
                // 2. Chạy hàm gửi JSON tới server API


                // Check internet trước khi đưa lên server
                if (navigator.onLine) {
                    (async () => {
                        const rawResponse = await fetch(myUrlCompare, {
                            method: 'POST',
                            headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                        },
                        body: JSON.stringify(jsonRequest)
                        });
                        const content = await rawResponse.json();


                        // Xu ly sau khi nhan dc respon
                        if (content.hasOwnProperty("score")) {
                            let score = content["score"];
                            console.log("score = " + score);
                            if (score > 75) {
                                // Đóng interval compare
                                clearInterval(davidWuCompareLoop);

                                // Mở một interval live
                                davidWuLiveLoop = setInterval(
                                    liveLoop, TIME_PER_LOOP
                                );

                            }
                            else if (score > 70) {
                                $(".david_wu_text").text("Hãy đưa khuôn mặt của bạn vào giữa màn hình");
                            }
                            else {
                                $(".david_wu_text").text("Hãy tháo khẩu trang hoặc tránh che mặt");
                            }
                        } else {
                            $(".david_wu_text").text("Hãy đưa khuôn mặt vào giữa màn hình");
                        }
                    })();
                }
                else {
                    $(".david_wu_text").text("Hãy kiểm tra lại kết nối internet của bạn");
                    setTimeout(function () {
                        // Sau 1500 ms thì quay lại.
                        count = MAX_NUMBER_OF_LOOP;
                    }, 1500);
                }
            });


            // Check
            count++;
            if (!navigator.onLine) count = MAX_NUMBER_OF_LOOP;

            if (count >= MAX_NUMBER_OF_LOOP) {
                // Đóng interval l
                clearInterval(davidWuCompareLoop);
                count = 0;

                setTimeout(function () {
                    $(".david_wu_text").text("Xác thực thất bại !");
                    // chuyển hướng trang
                    setTimeout(function () {
                        // Hiện khung xác thực
                        $(".david_wu_camera").css('display', 'none');

                        // Ẩn khung dữ liệu
                        $(".o_hr_attendance_kiosk_mode.david_wu_hide").show();
                        // close camera
                        setTimeout(function () {
                            closeCamera();
                        }, TIME_PER_LOOP);
                    }, TIME_PER_LOOP * 2);
                }, TIME_PER_LOOP);
            }

            // Tắt camera khi reload hoặc backward
            // if (performance.navigation.type == 1 || performance.navigation.type == 2) closeCamera();
            window.onhashchange = function() {
                clearInterval(davidWuCompareLoop);
                closeCamera();
            }
        }

        function liveLoop() {
            // Chạy một thread
            executeAsync(function() {
                // 0. Chụp ảnh người dùng
                let base64ImageCapture = getBase64AndResize(video);
                // 1. Chạy hàm đóng gói JSON
                let jsonRequest = packJsonApiLive(base64ImageCapture);

                let myUrlLive = "http://113.20.108.65:8080/v4/query/analyze";
                // 2. Chạy hàm gửi JSON tới server API
                if (navigator.onLine) {
                    (async () => {
                        const rawResponse = await fetch(myUrlLive, {
                            method: 'POST',
                            headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                        },
                        body: JSON.stringify(jsonRequest)
                        });
                        const content = await rawResponse.json();

                        // Xu ly sau khi nhan dc respon
                        if (content["faces"].length != 0) {
                            // Lấy được liveness
                            var faces = (content["faces"])[0];
                            var attributes = faces["attributes"];
                            var liveness = attributes["liveness"];
                            var pred = liveness["pred"];

                            console.log("predict = " + pred);
                            if (pred > 0.8) {
                                // Đóng interval compare
                                clearInterval(davidWuLiveLoop);
                                $(".david_wu_text").text("Xác thực thành công !");

                                // Tiếp tục chương trình
                                setTimeout(function () {
                                    self._rpc({
                                        model: 'hr.employee',
                                        method: 'attendance_manual',
                                        args: [[self.employee.id], 'hr_attendance.hr_attendance_action_my_attendances'],
                                    })
                                    .then(function(result) {
                                        if (result.action) {
                                            self.do_action(result.action);
                                        } else if (result.warning) {
                                            self.do_warn(result.warning);
                                        }
                                    });
                                }, 1000);
                                // Tiếp tục chương trình
                                setTimeout(function () {
                                    // close camera
                                    closeCamera();
                                }, 2000);

                            }
                            else if (pred > 0.65) {
                                $(".david_wu_text").text("Hãy đưa mặt của bạn lại gần một chút");
                            }
                            else {
                                $(".david_wu_text").html("<p>Ảnh không phải người thật,<br>vui lòng thử lại !</p>");
                            }
                        } else {
                            $(".david_wu_text").text("Ảnh không có khuôn mặt");
                        }
                    })();
                }
                else {
                    $(".david_wu_text").text("Vui lòng kiểm tra lại kết nối internet của bạn");
                    setTimeout(function () {
                        // Sau 1500 ms thì quay lại.
                        count = MAX_NUMBER_OF_LOOP;
                    }, 1500);
                }

            });

            // Check
            count++;
            if (!navigator.onLine) count = MAX_NUMBER_OF_LOOP;

            if (count >= MAX_NUMBER_OF_LOOP) {
                // Đóng interval l
                clearInterval(davidWuLiveLoop);
                count = 0;

                setTimeout(function () {
                    $(".david_wu_text").text("Xác thực thất bại !");
                    // chuyển hướng trang
                    setTimeout(function () {
                        // Hiện khung xác thực
                        $(".david_wu_camera").css('display', 'none');

                        // Ẩn khung dữ liệu
                        $(".o_hr_attendance_kiosk_mode.david_wu_hide").show();
                        // close camera
                        setTimeout(function () {
                            closeCamera();
                        }, TIME_PER_LOOP);
                    }, TIME_PER_LOOP * 2);
                }, TIME_PER_LOOP * 2);
            }

            // Tắt camera khi reload hoặc backward
            // if (performance.navigation.type == 1 || performance.navigation.type == 2) closeCamera();
            window.onhashchange = function() {
                clearInterval(davidWuCompareLoop);
                closeCamera();
            }
        }
    },
});

core.action_registry.add('hr_attendance_my_attendances', MyAttendances);

return MyAttendances;

});
