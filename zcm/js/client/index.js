var zcm = (function(){

    function create()
    {
        var socket = io();

        // Channel -> Callback
        var callbacks = {};

        var subIds = 0;

        socket.on('server-to-client', function(data){
            var subId = data.subId;
            if (subId in callbacks) {
                callbacks[subId].callback(data.channel, data.msg);
            }
        });

        /**
         * Publishes a message on the given channel of the specified zcmtype
         * @param {string} channel - the zcm channel to publish on
         * @param {string} type - the zcmtype of messages on the channel (must be a generated
         *                        type from zcmtypes.js)
         * @param {zcmtype} msg - a decoded zcmtype (from the generated types in zcmtypes.js)
         */
        function publish(channel, type, msg) {
            socket.emit('client-to-server', {channel: channel, type: type, msg: msg});
        }

        /**
         * Subscribes to zcm messages on the given channel of the specified zcmtype.
         * @param {string} channel - the zcm channel to subscribe to
         * @param {string} type - the zcmtype of messages on the channel (must be a generated
         *                        type from zcmtypes.js)
         * @param {dispatchDecodedCallback} cb - handler for received messages
         */
        function subscribe(channel, type, cb) {
            var subId = subIds++;
            callbacks[subId] = { callback: cb };
            socket.emit("subscribe", {channel: channel, type: type, subId: subId},
                        function(subscription) {
                callbacks[subId].subscription = subscription;
            });
            return subId;
        }

        /**
         * Subscribes to all zcm messages.
         * @param {dispatchDecodedCallback} cb - handler for received messages
         * @return {int} the subscription tag to use to unsubscribe
         */
        function subscribe_all(cb) {
            var subId = subIds++;
            callbacks[subId] = { callback: cb };
            socket.emit("subscribe_all", {subId: subId}, function(subscription) {
                callbacks[subId].subscription = subscription;
            });
            return subId;
        }

        /**
         * Unsubscribes from the zcm messages on the given channel
         * @param {int} subId - the subscription tag to unsubscribe from
         */
        function unsubscribe(subId) {
            if (subId in callbacks) {
                var sub = callbacks[subId].subscription;
                if (sub != null) { // loose compare here because sub might be undefined
                    socket.emit("unsubscribe", sub);
                    delete callbacks[subId];
                    return true;
                }
            }
            console.log("No subscription found, cannot unsubscribe");
            return false;
        }

        return {
            publish:        publish,
            subscribe:      subscribe,
            subscribe_all:  subscribe_all,
            unsubscribe:    unsubscribe,
        };
    }

    return {
        create: create
    };
})();
