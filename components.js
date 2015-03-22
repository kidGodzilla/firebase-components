var components = (function () {

    /**
     * Component lookup table
     */
    var lookup = {};
    var local = {};
    var bindings = {};

    /**
     * Dates for Humans (Now with time!)
     */
    function datesForHumans (int) {
        int = int || + new Date;
        int = parseInt(int, 10);
        return new Date(int).toString().split(' ').splice(0, 5).join(' ');
    }

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
            $('[data-include-url]').each(function () {
                var sourceURL = $(this).attr('data-include-url');

                $(this).load(sourceURL, function () {
                    // Ensure all new elements have IDs
                    assignIDsToElements();
                });
            });
        });
    }

    /**
     * PARSE LOGIC-LESS HANDLEBARS TEMPLATES
     */
    function parseTemplate (data, template) {

        for(var current in data) {
            current = current.trim();
            if (current) template = template.replace(new RegExp('{{(\\s+|)'+current+'(\\s+|)}}','g'), data[current]);
        }

        template = template.replace(new RegExp('{{(.+)}}','g'), '');

        return template;
    }

    /**
     * DATA DESTINATION
     */
    function inputComponents () {
        $('[data-destination]').each(function () {
            var $component = $(this);
            $component.find('button[data-action=create]').click(function () {

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

            /**
             * Update record
             */
            $component.find('button[data-action=update]').click(function () {

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

                updateRecord(destination, data);
            });
        });
    }

    /**
     * DATA SOURCE
     */
    function buildComponents () {
        $('[data-source]').each(function () {
            var $component = $(this);
            buildComponent($component);
        });
    }

    /**
     * Build a component
     */
    function buildComponent ($component) {
        var dataSource = $component.attr('data-source');
        var template = $component.clone();
        var id = $component.attr('id');

        // Update a lookup table with bindings
        if (!components.bindings[dataSource])
            components.bindings[dataSource] = [];

        components.bindings[dataSource].push(id);

        // Empty the container
        $component.html('');

        if (dataSource === "@") {
            var data = local;
            // Normalize our incoming data
            data = [components.local];
            renderComponent($component, data, template);
        } else {
            // Watch for firebase updates
            var ref = components.get('firebaseRef');

            // On data update
            ref.child(dataSource).on("value", function(snapshot) {
                var data = snapshot.val();
                // Normalize our incoming data
                data = normalizeFirebaseData(data);
                renderComponent($component, data, template);
            });
        }
    }

    /**
     * Normalize JSON data
     */
    function normalizeFirebaseData (data) {
        var dataObj = data;
        data = [];

        for (var obj in dataObj) {
            var tmp = dataObj[obj];
            if (!tmp.id) tmp.id = obj;
            data.push(tmp);
        }

        // Sort by created key
        data.sort(function(a, b){
            return b.created - a.created;
        });

        return data;
    }

    /**
     * Render a component with a specific data payload
     */
    function renderComponent ($component, data, template) {

        /**
         * Handle Pagination & Sorting
         */
        // Determine offset
        var offset = parseInt($component.attr('data-offset')) || 0;

        // Reverse if sort order is descending
        if ($component && $component.attr('data-sort') && $component.attr('data-sort').toLowerCase()[0] === "d")
            data.reverse();

        // Total should be our data.length or limit (minus offset), whichever is greater
        var limit = parseInt($component.attr('data-limit')) || data.length - offset;
        if (data.length - offset < limit) limit = data.length - offset;

        /**
         * Cache everything in a lookup table
         */
        cacheInLookup($component, data, template);

        /**
         * Render data to template
         */
        renderTemplateToComponent($component, data, template, limit, offset);
        console.log('rendered')
    }

    /**
     * Cache $component reference, data, & template in _lookup_
     */
    function cacheInLookup ($component, data, template) {
        var component = {};
        var id = $component.attr('id');
        component.$component = $component;
        component.data = data;
        component.template = template;
        lookup[id] = component;
    }

    /**
     * Render Template to Component
     */
    function renderTemplateToComponent ($component, data, template, limit, offset) {

        // Reset our $component
        $component.html('');

        // Component tagName
        var componentTagName = $component.prop('tagName');
        componentTagName = componentTagName.trim().toLowerCase();
        if (!componentTagName) componentTagName = "div";

        // Loop through applicable JSON rows
        for (var i = 0 + offset; i < limit + offset; i++) {

            // Create a clone of the template
            var tmp = $(template).clone();
            var $tmp = $(tmp);
            $tmp.attr('id', '');

            // Fill in the blanks, v.2
            $tmp = $($.parseHTML("<"+componentTagName+">" + parseTemplate(data[i], $tmp.html()) + "</"+componentTagName+">"));

            // Add in our helper functionality
            $tmp = addHelpers($tmp, data[i]);

            // Append the item
            $component.append($tmp.children());
        }
    }

    /**
     * Helpers
     */
    function addHelpers ($tmp, model) {
        // data-show-if
        $tmp.find('[data-show-if]').each(function () {
            console.log(this);
            var $this = $(this);
            model[$this.attr('data-show-if')] ? $this.show() : $this.hide();
        });

        // data-hide-if
        $tmp.find('[data-hide-if]').each(function () {
            var $this = $(this);
            model[$this.attr('data-show-if')] ? $this.hide() : $this.show();
        });

        // Todo: data-show-if-function & data-hide-if-function

        return $tmp;
    }

    /**
     * component internal datastore getter
     */
    function get (key) {
        return components.data[key];
    }

    /**
     * component internal datastore setter
     */
    function set (key, value) {
        return components.data[key] = value;
    }

    /**
     * component instance datastore getter
     */
    function getLocal (key) {
        return components.local[key];
    }

    /**
     * component instance datastore setter
     */
    function setLocal (data) {
        components.local = $.extend({}, local, data);
        renderAllComponents();
    }

    function renderAllComponents() {
        var bindingsLookup = components.bindings;
        if (bindingsLookup["@"]) {
            var boundLocally = bindingsLookup["@"];
            for (var k = 0; k < boundLocally.length; k++) {
                var id = boundLocally[k];
                components._lookup_[id].data = components.local;
            }
        }

        var componentsLookup = components._lookup_;
        for (j in componentsLookup) {
            var c = componentsLookup[j];
            console.log(c.$component);
            renderComponent(c.$component, c.data, c.template);
        }
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
    function init (callback) {
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

            if (callback && typeof(callback) === "function") callback();
        });
    }

    function updateRecord (destination, data) {

    }

    /**
     * CREATE A RECORD
     */
    function createRecord (destination, data) {
        // Todo: Check that our user is authenticated

        if (destination === "@") {
            // Local reference
            data.updated = + new Date;
            components.setLocal(data);
        } else {
            // Use firebase
            var ref = components.get('firebaseRef');

            ref.child(destination).on("value", function(snapshot) {
                var base = snapshot.val();
                if (!base) ref.child(destination).set(true);
            });

            var next = PUID();
            data.created = + new Date;
            data.updated = data.created;

            ref.child(destination +"/"+next).set(data);
        }
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
        renderTemplateToComponent: renderTemplateToComponent,
        executeFunctionArray: executeFunctionArray,
        assignIDsToElements: assignIDsToElements,
        renderAllComponents: renderAllComponents,
        buildComponents: buildComponents,
        inputComponents: inputComponents,
        registerGlobal: registerGlobal,
        parseTemplate: parseTemplate,
        HTMLIncludes: HTMLIncludes,
        bindings: bindings,
        getLocal: getLocal,
        setLocal: setLocal,
        _lookup_: lookup,
        local: local,
        init: init,
        get: get,
        set: set
    };

    obj = $.extend({}, _, obj);

    return obj;
})();