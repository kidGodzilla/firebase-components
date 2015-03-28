/****************************************************
 * Router.js
 ***************************************************/

/**
 * Generic core object
 */
var Core = function () {

    /**
     * datastore getter
     */
    function get (key) {
        return this.data[key];
    }


    /**
     * datastore setter
     */
    function set (key, value) {
        return this.data[key] = value;
    }


    /**
     * Executes an array of functions, Sequentially
     */
    function executeFunctionArray (functionArray, args) {
        if (typeof(functionArray) !== "object" || !functionArray.length) return false;

        for (var i = 0; i < functionArray.length; i++) {
            args = functionArray[i](args);
        }

        return args;
    }


    /**
     * Registers a new global on the current object
     */
    function registerGlobal (key, value) {

        if (typeof(this[key]) === "undefined") {

            if (typeof(value) === "function") {

                this[key] = function () {
                    /**
                     * Prepare Arguments
                     *
                     * TODO: (Source: MDN)
                     * You should not slice on arguments because it prevents optimizations in JavaScript
                     * engines (V8 for example). Instead, try constructing a new array by iterating
                     * through the arguments object.
                     */
                    // var args = Array.prototype.slice.call(arguments);
                    var args = arguments;
                    if (args.length === 0) args = null;

                    /**
                     * Execute Before hooks on the arguments
                     */
                    if (this.hooks[key] && this.hooks[key].before && this.hooks[key].before.length > 0)
                        args = executeFunctionArray(this.hooks[key].before, args);

                    /**
                     * Execute the intended function
                     */
                    result = value.apply(this, args);

                    /**
                     * Execute After hooks on the result
                     */
                    if (this.hooks[key] && this.hooks[key].after && this.hooks[key].after.length > 0)
                        result = executeFunctionArray(this.hooks[key].after, result);

                    return result;
                };

            } else {

                // If the global is being set to any other type of object or value, just do it.
                this[key] = value;

            }

        } else {
            console.log("ERROR: A module attempted to write to the `" + key + "` namespace, but it is already being used.");
        }
    }


    /**
     * Registers a new before hook on a method
     *
     * Example:
     * We could add a before hook to generateUID which always set the separator to `+`
     *
     * ```javascript
     * this.before('generateUID', function(args) {
     *     if (args) args[0] = '+';
     *     return args;
     * });
     * ```
     *
     * Then, when we called generateUID('-'), we would get a GUID separated by `+` instead.
     *
     * TODO: Consider moving this.before & this.after to a private namespace to they cannot
     * be easily accessed by 3rd party code.
     *
     */
    function before (key, func) {
        if (!this.hooks[key]) this.hooks[key] = {};
        if (!this.hooks[key].before) this.hooks[key].before = [];
        this.hooks[key].before.push(func);
    }


    /**
     * Registers a new after hook on a this method
     */
    function after (key, func) {
        if (!this.hooks[key]) this.hooks[key] = {};
        if (!this.hooks[key].after) this.hooks[key].after = [];
        this.hooks[key].after.push(func);
    }


    /**
     * Return public objects & methods
     */
    obj = {
        data: {},
        hooks: {},
        executeFunctionArray: executeFunctionArray,
        registerGlobal: registerGlobal,
        before: before,
        after: after,
        get: get,
        set: set
    };

    return obj;
};





/****************************************************
 * Router.js-specific functionality
 ***************************************************/

/**
 * Instantiate the router object from Core()
 */
var router = new Core();


/**
 * Transition to a named route
 *
 * ```javascript
 * // Transition to the main menu
 * router.transitionTo('main-menu');
 * ```
 */
router.registerGlobal('transitionTo', function (route) {
    var currentPage = router.get('currentPage');
    var debounce = router.get('debounce');

    if (route !== currentPage && !debounce) {
        // Set transitioning state and initiate debouncing
        router.set('transitioning', true);
        router.set('debounce', true);

        // Unload the current route
        router.unload(currentPage);

        // Load the new route
        router.load(route);

        // Update the values for our current and previous page
        router.set('previousPage', currentPage);
        router.set('currentPage', route);

        // Reset debouncing values & transitioning
        setTimeout(function() {
            router.set('debounce', true);
            router.set('transitioning', false);
        }, 500); // This is the debounce value
    }
});


/**
 * Load a route
 */
router.registerGlobal('load', function (route) {
    if(router.routes[route] && router.routes[route].load)
        var f = router.routes[route].load;

    if (f && typeof(f) === "function") return f();
    return false;
});


/**
 * Unload a route
 */
router.registerGlobal('unload', function (route) {
    if(router.routes[route] && router.routes[route].unload)
        var f = router.routes[route].unload;

    if (f && typeof(f) === "function") return f();
    return false;
});


/**
 * Define a new route or overwrite an existing route
 *
 *
 * ```javascript
 * // Transition to the main menu
 * router.defineRoute('main-menu', {
 *   load: function () {
 *      $('#mainMenu').fadeIn();
 *   },
 *   unload: function () {
 *      $('#mainMenu').fadeOut();
 *   }
 * });
 * ```
 */
router.registerGlobal('defineRoute', function (route, params) {
    if (router.routes && !router.routes[route])
        router.routes[route] = {};

    if (route && params && params.load)
        router.routes[route].load = params.load;

    if (route && params && params.unload)
        router.routes[route].unload = params.unload;

    return true;
});


/**
 * Instantiate an Empty routes object to hold transition functions
 */
router.registerGlobal('routes', {});


/**
 * Facilitate easily transitioning back to the previous route/state
 */
router.registerGlobal('goBack', function () {
    router.transitionTo(previousPage);
});





/****************************************************
 * Example in-app code
 ***************************************************/


/**
 * Facilitate transitions for the Main Menu
 */
router.defineRoute('main-menu', {

    // Executes each time we load the `main-menu` route
    load: function () {
        var width = window.innerWidth;
        $('.strip-1').css('-webkit-transform', 'translateX(' + (width + 326) + 'px)');
        $('.strip-2').css('-webkit-transform', 'translateX(' + (width + 226) + 'px) scaleX(-1)');
        $('.strip-3').css('-webkit-transform', 'translateX(-' + (width + 326) + 'px) scaleX(-1)');
        setTimeout(function() {
            $('.middle.two h1').html('Welcome!');
            $('.middle.two h3').html('How can I help you?');
            $('.bar-4,.bar-5,.bar-6').css('-webkit-transform', 'translateX(0)');
            $('.middle.two, .logo').fadeIn('slow');
        }, 500);
    },

    // Executes each time we unload the route
    unload: function () {
        $('.bar-4,.bar-5,.bar-6').css('-webkit-transform', 'translateX(-100%)');
        $('.middle.two, .logo').fadeOut();
    }
});


/**
 * Facilitate transitions for the "I'm here to make a delivery" form
 */
router.defineRoute('delivery-form', {

    // Executes each time we load the `delivery-form` route
    load: function () {
        $('.strip-1').css('-webkit-transform', 'translateX(0px)');
        $('.strip-2, .strip-3').css('-webkit-transform', 'translateX(0px) scaleX(-1)');
        $('.title, .bar-2, .bar-3').css('-webkit-transform', 'translateX(0)');
        $('.title h1').html('Delivery');
        // setTimeout(function () {
        //    $('.middle.one').fadeIn();
        // }, 500);
        setTimeout(function() {
            $('.middle.two h1').html('I am here to<br>make a delivery.');
            $('.middle.two h3').html('');
            $('.bar-3 h1').html('CONFIRM');
            $('.middle.two').fadeIn();
        }, 500);
    },

    // Executes each time we unload the route
    unload: function () {
        $('.title, .bar-2').css('-webkit-transform', 'translateX(-100%)');
        $('.bar-3').css('-webkit-transform', 'translateX(100%)');
        $('.middle.one').fadeOut();
        setTimeout(function() {
            $('button.select').removeClass('selected');
        }, 500);
    }
});


/**
 * Facilitate transitions for the "I'm here to meet someone" form
 */
router.defineRoute('meeting-form', {

    // Executes each time we load the `meeting-form` route
    load: function () {
        matchEmail = null;
        matchName = null;
        phoneNumber = null;
        $('.strip-1').css('-webkit-transform', 'translateX(0px)');
        $('.strip-2, .strip-3').css('-webkit-transform', 'translateX(0px) scaleX(-1)');
        $('.title, .bar-2').css('-webkit-transform', 'translateX(0)');
        $('.title h1').html('Meeting');
        $('.bar-3 h1').html('SUBMIT');
        setTimeout(function() {
            $('.middle.three').fadeIn();
        }, 500);
    },

    // Executes each time we unload the route
    unload: function () {
        $('.title, .bar-2').css('-webkit-transform', 'translateX(-100%)');
        $('.bar-3').css('-webkit-transform', 'translateX(100%)');
        $('.middle.three').fadeOut();
        setTimeout(function() {
            $('input[type=text]').val('');
            meetingWith = visitorName = '';
            $('.bar-3').css('bottom', '5%');
        }, 1000);
    }
});


/**
 * Facilitate transitions for the "No solicitors" screen
 */
router.defineRoute('solicitation', {

    // Executes each time we load the `solicitation` route
    load: function () {
        $('.strip-1').css('-webkit-transform', 'translateX(0px)');
        $('.strip-2, .strip-3').css('-webkit-transform', 'translateX(0px) scaleX(-1)');
        $('.title, .bar-2').css('-webkit-transform', 'translateX(0)');
        $('.title h1').html('No Solicitors');
        setTimeout(function() {
            $('.middle.two h1').html('');
            $('.middle.two h3').html('Solicitation or distribution of printed materials is strictly prohibited on these premises.');
            $('.middle.two').fadeIn();
        }, 500);
    },

    // Executes each time we unload the route
    unload: function () {
        $('.title, .bar-2').css('-webkit-transform', 'translateX(-100%)');
        $('.bar-3').css('-webkit-transform', 'translateX(100%)');
        $('.middle.two').fadeOut();
    }
});


/**
 * Facilitate transitions for the email sent confirmation screen
 */
router.defineRoute('email-confirmation', {

    // Executes each time we load the `email-confirmation` route
    load: function () {
        $('.strip-1').css('-webkit-transform', 'translateX(0px)');
        $('.strip-2, .strip-3').css('-webkit-transform', 'translateX(0px) scaleX(-1)');
        $('.title, .bar-2').css('-webkit-transform', 'translateX(0)');
        $('.title h1').html('Thanks!');
        setTimeout(function() {
            $('.middle.two h1').html('A message has been sent to your contact letting them know you have arrived.');
            $('.middle.two h3').html('');
            $('.middle.two').fadeIn();
        }, 500);
    },

    // Executes each time we unload the route
    unload: function () {
        $('.title, .bar-2').css('-webkit-transform', 'translateX(-100%)');
        $('.bar-3').css('-webkit-transform', 'translateX(100%)');
        $('.middle.two').fadeOut();
    }
});


/**
 * Facilitate transitions for the delivery confirmation screen
 */
router.defineRoute('delivery-confirmation', {

    // Executes each time we load the `delivery-confirmation` route
    load: function () {
        $('.strip-1').css('-webkit-transform', 'translateX(0px)');
        $('.strip-2, .strip-3').css('-webkit-transform', 'translateX(0px) scaleX(-1)');
        $('.title, .bar-2').css('-webkit-transform', 'translateX(0)');
        $('.title h1').html('Thanks!');
        setTimeout(function() {
            $('.middle.two h1').html('Someone will be<br>out shortly.');
            $('.middle.two h3').html('');
            $('.middle.two').fadeIn();
        }, 500);
    },

    // Executes each time we unload the route
    unload: function () {
        $('.title, .bar-2').css('-webkit-transform', 'translateX(-100%)');
        $('.bar-3').css('-webkit-transform', 'translateX(100%)');
        $('.middle.two').fadeOut();
    }
});


/**
 * Facilitate transitions when the app loses internet connectivity
 */
router.defineRoute('offline', {

    // Executes each time we load the `offline` route
    load: function () {
        $('.strip-1').css('-webkit-transform', 'translateX(0px)');
        $('.strip-2, .strip-3').css('-webkit-transform', 'translateX(0px) scaleX(-1)');
        $('.title, .bar-2').css('-webkit-transform', 'translateX(0)');
        $('.title h1').html('No Connection');
        setTimeout(function() {
            $('.middle.two h1').html('For assistance call<br><br>+1 (206) 428-6030 x050');
            $('.middle.two h3').html('');
            $('.middle.two').fadeIn();
        }, 500);
    },

    // Executes each time we unload the route
    unload: function () {
        $('.title, .bar-2').css('-webkit-transform', 'translateX(-100%)');
        $('.bar-3').css('-webkit-transform', 'translateX(100%)');
        $('.middle.two').fadeOut();
    }
});
