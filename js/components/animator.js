var Eases = require('eases')
var Lerp = require('lerp')

var internals = {
	
	updateObjectValue : function( elapsed, keyframe, action ) {
		
		var t = ( elapsed - keyframe.start ) / keyframe.duration
		
		action.obj[action.key] = Lerp(
			action.values[0]
		  , action.values[1]
		  , keyframe.easing(t)
		)
		
	},
	
	updateFn : function( poem, keyframes, maxTime, speed ) {
		
		return function(e) {
			
			var elapsed = (e.elapsed * speed) % maxTime
			
			for( var i=0; i < keyframes.length; i++ ) {
				var keyframe = keyframes[i]
				
				//Time is in range
				if( elapsed >= keyframe.start && elapsed <= keyframe.end ) {
					
					for( var j=0; j < keyframe.actions.length; j++ ) {
						
						var action = keyframe.actions[j]
						internals.updateObjectValue( elapsed, keyframe, action )
					}
				}
			}
		}
	},
	
	easingFn : function( easingProp ) {
		
		var easingName, easingFn
		
		if( !easingProp || _.isString( easingProp ) ) {
			
			easingName = easingProp || "linear"
			easingFn = Eases[ easingName ]
		}
		
		if( _.isFunction( easingProp ) ) {
			
			easingFn = easingProp
			
			if( easingFn(0) !== 0 || easingFn(1) !== 1 ) {
				throw new Error( "poem-animator received an easing function that didn't return a 0 and 1", easingProp )
			}
		}
		
		if( !_.isFunction( easingFn ) ) {
			throw new Error( "poem-animator was not able to find the easing function " + easingProp )
		}
		return easingFn
		
	},
	
	createAction : function( poem, action ) {
		
		// example action: [ "camera.object.position.x", [0, 10] ]
		
		var keyParts = action[0].split('.')
		var path = keyParts.slice(0,keyParts.length - 1)
		var key = _.last(keyParts)
		var values = action[1]
		
		var obj = _.reduce( path, function( memo, pathPart ) {
			
			var nextRef = memo[pathPart]
			if( !_.isObject( nextRef ) ) {
				throw new Error( "poem-animator was not able to create a reference", action )
			}
			return nextRef
		}, poem)
		
		return {
			obj : obj,
			key : key,
			values: values
		}
	},
	
	processKeyframeConfig : function( poem, keyframes ) {
		
		return _.map( keyframes, function( keyframe ) {

			return {
				start       : keyframe.start
			  , end			: keyframe.start + keyframe.duration
			  , duration    : keyframe.duration
			  , easing      : internals.easingFn( keyframe.easing )
			  , actions     : _.map( keyframe.actions, _.partial( internals.createAction, poem ) )
			}
		})
	},
	
	calcMaxTime : function( keyframes, loop ) {
		
		if( loop ) {
			return _.reduce( keyframes, function( memo, keyframe ) {
				return Math.max( memo, keyframe.end )
			}, 0)
		} else {
			return Infinity
		}
	},
}

module.exports = function( poem, properties ) {
	
	var config = _.extend({
		keyframes : []
	  , loop : true
	  , speed : 1
	}, properties)
	
	var keyframes = internals.processKeyframeConfig( poem, config.keyframes )
	var maxTime = internals.calcMaxTime( keyframes, config.loop )
	
	poem.emitter.on('update', internals.updateFn( poem, keyframes, maxTime, config.speed ) )
	
	return {}
}