var components = (function () {

    /**
     * Find highest data-id-offset
     */
    function findDataIDOffset (callback) {
        var total = 0;
        for (var i = 0; i < 1000; i++) {
            if ($('#component-'+i).length === 0)
                total++;

            if (total === 5) {
                components.set('idOffset', i);
                $('body').attr('data-id-offset', i);
                callback(i);
                return true;
            }
        }
    }

    /**
     * Ensure all elements have Ids (Otherwise we couldn't shadowDOM)
     */
    function assignIDsToElements (offset) {
        var i = $('body').attr('data-id-offset') || 0;
        $('body *').each(function () {
            if (!$(this).attr('id') || $(this).attr('id') === "") {
                $(this).attr('id', 'component-' + i++);
                $('body').attr('data-id-offset', i);
            }
        });
    }

    /**
     * Handle includes
     */
    function HTMLIncludes () {
        $(document).ready(function () {
            $('.html-include').each(function () {
                var sourceURL = $(this).attr('data-source-url');

                $(this).load(sourceURL, function () {

                    var _i = $('body').attr('data-id-offset') || 0;

                    // Ensure all elements have IDs
                    assignIDsToElements();
                });
            });
        });
    }

    /**
     * PARSE LOGIC-LESS HANDLEBARS TEMPLATES
     */
    function parseTemplate (data, template) {
        for(var current in data)
            template = template.replace(new RegExp('{{'+current+'}}','g'), data[current]);
        return template;
    }

    /**
     * DATA DESTINATION
     */
    function inputComponents () {
        $('[data-destination]').each(function () {
            var $component = $(this);
            $component.find('button[data-action=create]').click(function () {
                console.log('clicked');

                var destination = $component.attr('data-destination');
                var data = {};

                $component.find('input[name]').each(function () {
                    var name = $(this).attr('name');
                    data[name] = $(this).val();

                    // Reset me
                    $(this).val('');
                });

                $component.find('textarea[name]').each(function () {
                    var name = $(this).attr('name');
                    data[name] = $(this).val();

                    // Reset me
                    $(this).val('');
                });

                createRecord(destination, data);
            });
        });
    }

    var comps = [];

    /**
     * DATA SOURCE
     */
    function buildComponents () {
        $('[data-source]').each(function () {
            var $this = $(this);

            var component = {};
            component.id = $this.attr('id');
            component.dataSource = $this.attr('data-source');
            comps.push(component);

            // Construct the template
            var template = $this.clone();

            // Empty container
            $this.html('');

            // Watch for firebase updates
            var ref = components.get('firebaseRef');

            // Get destination
            var destination = component.dataSource;

            ref.child(destination).on("value", function(snapshot) {
                var base = snapshot.val();
                renderComponent($this, base, template);
            });
        });
    }

    /**
     * Render a component with a specific data payload
     */
    function renderComponent ($this, data, template) {

        // Reset $this
        $this.html('');

        // Determine offset
        var offset = parseInt($this.attr('data-offset')) || 0;

        var dataObj = data;
        data = [];

        for (var obj in dataObj) {
            data.push(dataObj[obj]);
        }

        // Sort by created key
        data.sort(function(a, b){
            return b.created - a.created;
        });

        // Reverse if sort order is descending
        if ($this.attr('data-sort').toLowerCase()[0] === "d")
            data.reverse();

        // Total should be our data.length or limit (minus offset), whichever is greater
        var total = parseInt($this.attr('data-limit')) || data.length - offset;
        if (data.length - offset < total) total = data.length - offset;

        // Loop through applicable JSON rows
        for (var i = 0 + offset; i < total + offset; i++) {

            // Create a clone of the template
            var tmp = $(template).clone();
            var $tmp = $(tmp);
            $tmp.attr('id', '');

            // Fill in the blanks, v.2
            $tmp = $($.parseHTML("<div>" + parseTemplate(data[i], $tmp.html()) + "</div>"));

            // data-show-if
            $tmp.find('[data-show-if]').each(function () {
                var $this = $(this);
                data[i][$this.attr('data-show-if')] ? $this.show() : $this.hide();
            });

            // data-hide-if
            $tmp.find('[data-hide-if]').each(function () {
                var $this = $(this);
                data[i][$this.attr('data-show-if')] ? $this.hide() : $this.show();
            });

            // Todo: data-show-if-function & data-hide-if-function

            // Append the item
            var item = $tmp.children();
            $this.append(item);
        }
    }

    /**
     * component datastore getter
     */
    function get (key) {
        return components.data[key];
    }

    /**
     * component datastore setter
     */
    function set (key, value) {
        return components.data[key] = value;
    }

    /**
     * Executes an array of functions, Sequentially
     */
    function executeFunctionArray (functionArray) {
        if (typeof(functionArray) !== "object" || !functionArray.length) return false;

        for (var i = 0; i < functionArray.length; i++) {
            functionArray[i]();
        }

        return true;
    }

    /**
     * Registers a new global on the components object
     */
    function registerGlobal (key, value) {
        if (typeof(components[key]) === "undefined")
            components[key] = value;
    }

    /**
     * Initialize the components object
     */
    function init () {
        $(document).ready(function () {
            // Assign Ids to elements
            findDataIDOffset(assignIDsToElements);

            // Get Firebase
            var firebaseSite = $('body[data-firebase-site]').attr('data-firebase-site');
            if (!firebaseSite || firebaseSite.length === 0)
                firebaseSite = "component-playground";

            // Initialize Firebase
            var firebaseRef = new Firebase("https://" + firebaseSite + ".firebaseio.com/");
            components.set('firebaseSite', firebaseSite);
            components.set('firebaseRef', firebaseRef);

            HTMLIncludes();
            buildComponents();
            inputComponents();
        });
    }

    /**
     * CREATE A RECORD
     */
    function createRecord (destination, data) {
        // Todo: Check that our user is authenticated

        var ref = components.get('firebaseRef');

        ref.child(destination).on("value", function(snapshot) {
            var base = snapshot.val();

            if (!base)
                ref.child(destination).set(true);
        });

        data.created = + new Date;

        var next = PUID();

        ref.child(destination +"/"+next).set(data);
    }

    /**
     * PSEUDO-UNIQUE IDENTIFIER
     */
    function PUID () {
        return Math.random().toString(36).substring(2);
    }

    /**
     * Return public objects & methods
     */
    obj = {
        data: {},
        executeFunctionArray: executeFunctionArray,
        assignIDsToElements: assignIDsToElements,
        buildComponents: buildComponents,
        inputComponents: inputComponents,
        registerGlobal: registerGlobal,
        parseTemplate: parseTemplate,
        HTMLIncludes: HTMLIncludes,
        list: comps,
        init: init,
        get: get,
        set: set

    };

    obj = $.extend({}, _, obj);

    return obj;
})();