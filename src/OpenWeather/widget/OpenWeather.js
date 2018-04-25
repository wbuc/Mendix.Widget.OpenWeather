/*global logger*/
/*
    OpenWeather
    ========================

    @file      : OpenWeather.js
    @version   : 1.0.0
    @author    : <You>
    @date      : 2018-4-20
    @copyright : <Your Company> 2016
    @license   : Apache 2

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",

    "OpenWeather/lib/jquery-1.11.2",
    "dojo/text!OpenWeather/widget/template/OpenWeather.html"
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, lang, dojoText, dojoHtml, dojoEvent, _jQuery, widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true);

    // START *** Private functions 
    var widgetClass;
    var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    var setWeatherImage = function (iconCode) {
        var iconUrl = "https://openweathermap.org/img/w/" + iconCode + ".png";
        $(widgetClass + ' .weather-icon').html("<img src='" + iconUrl + "'>");
    };

    var createTodayDisplayTemplate = function (data) {
        var tempr = Math.round(data.main.temp);
        var location = data.name;
        var country = data.sys.country;
        var tempDesc = data.weather[0].description;
        var icon = data.weather[0].icon;

        //get the widget main class
        widgetClass = "." + this.class;
        
        //If an icon is present, set the image
        if (icon) {
            setWeatherImage(icon);
        }
        
        //set the date if widget configured for it.
        if(this.dateFormat !== 'none'){
            var today = new Date();
            var todayDate = this.dateFormat === 'todayFriendly' ? dayNames[today.getDay()] : today.toLocaleDateString(navigator.language)
            $(widgetClass + ' .weather-currentDate').text(todayDate);   
        }
       
        $(widgetClass + ' .weather-location').text(location+ ", "+country);
        $(widgetClass + ' .weather-summary').text(tempDesc);

 
        if (this.temperatureDisplayType === 'average') {
            $(widgetClass + ' .weather-result').text(tempr + '°');
        } else if (this.temperatureDisplayType === 'minMax') {
            var minTemp = Math.round(data.main.temp_min) + '°';
            var maxTemp = Math.round(data.main.temp_max) + '°';
            $(widgetClass + ' .weather-result').html("<span>" + maxTemp + "</span><span class='temp-min'>" + minTemp + "</span>");
        }
    }

    var getWeatherDetail = function () {
        var measurement = this.temperatureMeasurement === 'celcius' ? 'metric' : 'imperial';
        var api_url = this.serviceBaseURL + 'data/2.5/weather?q=' + this.city + '&units=' +
            measurement + '&appid='+ this.apiKey;
       
        $.ajax({
            url: api_url,
            method: 'GET',
            success: function (data) {
                createTodayDisplayTemplate.call(this, data);
            }.bind(this)
        });
    };

    var buildURL = function () {
        //TODO: v2.0 - build the URL for current vs. 5 day.
    };
    // END *** Private Functions
    
    
    // Declare widget's prototype.
    return declare("OpenWeather.widget.OpenWeather", [_WidgetBase, _TemplatedMixin], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements
        inputNodes: null,
        colorSelectNode: null,
        colorInputNode: null,
        infoTextNode: null,
        searchCity: null,

        // Parameters configured in the Modeler.
        city: "",
        country: "",
        weatherDisplayType: "",
        temperatureDisplayType: "",
        temperatureMeasurement: "",
        dateFormat: "",
        serviceBaseURL: "",
        apiKey: "",
        mfToExecute: "",
        

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,
        _readOnly: false,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            logger.debug(this.id + ".constructor");
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            logger.debug(this.id + ".postCreate");
            console.log('_postCreate starting', this.city + ' ' + this.country + ' ' + this.weatherDisplayEnum);

            if (this.readOnly || this.get("disabled") || this.readonly) {
                this._readOnly = true;
            }
            
            //call Open Weather API.
            getWeatherDetail.call(this);
            
            this._updateRendering();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            logger.debug(this.id + ".update");
            
            console.log('Context Changed: ',this);
            
            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering(callback); // We're passing the callback to updateRendering to be called after DOM-manipulation
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {
            logger.debug(this.id + ".enable");
        },

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function () {
            logger.debug(this.id + ".disable");
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {
            logger.debug(this.id + ".resize");
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function (e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        // Attach events to HTML dom elements
        _setupEvents: function () {
            logger.debug(this.id + "._setupEvents");
            console.log('_setupEvents starting');
            this.connect(this.infoTextNode, "click", function (e) {
                // Only on mobile stop event bubbling!
                this._stopBubblingEventOnMobile(e);

                // If a microflow has been set execute the microflow on a click.
                if (this.mfToExecute !== "") {
                    this._execMf(this.mfToExecute, this._contextObj.getGuid());
                }
            });
        },

        _execMf: function (mf, guid, cb) {
            logger.debug(this.id + "._execMf");
            if (mf && guid) {
                mx.ui.action(mf, {
                    params: {
                        applyto: "selection",
                        guids: [guid]
                    },
                    callback: lang.hitch(this, function (objs) {
                        if (cb && typeof cb === "function") {
                            cb(objs);
                        }
                    }),
                    error: function (error) {
                        console.debug(error.description);
                    }
                    ``
                }, this);
            }
        },

        // Rerender the interface.
        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");
            //this.colorSelectNode.disabled = this._readOnly;
            //this.colorInputNode.disabled = this._readOnly;
            console.log('_updateRendering starting ', this.city + ' ' + this.country + ' ' + this.weatherDisplayEnum);

            dojoStyle.set(this.domNode, "display", "block");

            //if (this._contextObj !== null) {
            //    dojoStyle.set(this.domNode, "display", "block");

            //var colorValue = this._contextObj.get(this.backgroundColor);

            //this.colorInputNode.value = colorValue;
            //this.colorSelectNode.value = colorValue;

            //dojoHtml.set(this.infoTextNode, this.messageString);
            //dojoStyle.set(this.infoTextNode, "background-color", colorValue);
            //} else {
            //    dojoStyle.set(this.domNode, "display", "none");
            //}

            // Important to clear all validations!
            this._clearValidations();

            // The callback, coming from update, needs to be executed, to let the page know it finished rendering
            this._executeCallback(callback, "_updateRendering");
        },

        // Handle validations.
        _handleValidation: function (validations) {
            logger.debug(this.id + "._handleValidation");
            this._clearValidations();

            // var validation = validations[0],
            //     message = validation.getReasonByAttribute(this.backgroundColor);

            // if (this._readOnly) {
            //     validation.removeAttribute(this.backgroundColor);
            //  } else if (message) {
            //      this._addValidation(message);
            //      validation.removeAttribute(this.backgroundColor);
            //  }
        },

        // Clear validations.
        _clearValidations: function () {
            logger.debug(this.id + "._clearValidations");
            dojoConstruct.destroy(this._alertDiv);
            this._alertDiv = null;
        },

        // Show an error message.
        _showError: function (message) {
            logger.debug(this.id + "._showError");
            if (this._alertDiv !== null) {
                dojoHtml.set(this._alertDiv, message);
                return true;
            }
            this._alertDiv = dojoConstruct.create("div", {
                "class": "alert alert-danger",
                "innerHTML": message
            });
            dojoConstruct.place(this._alertDiv, this.domNode);
        },

        // Add a validation.
        _addValidation: function (message) {
            logger.debug(this.id + "._addValidation");
            this._showError(message);
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            this.unsubscribeAll();

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });

                //this.subscribe({
                //    guid: this._contextObj.getGuid(),
                //attr: this.backgroundColor,
                //callback: lang.hitch(this, function (guid, attr, attrValue) {
                //        this._updateRendering();
                //    })
                //});

                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: lang.hitch(this, this._handleValidation)
                });
            }
        },

        _executeCallback: function (cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["OpenWeather/widget/OpenWeather"]);
