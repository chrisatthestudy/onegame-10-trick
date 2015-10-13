/*
 * =============================================================================
 * Trick Or Treat
 * =============================================================================
 * October game for One Game A Month
 *
 * (c) 2013 chrisatthestudy
 * -----------------------------------------------------------------------------
 * See the end of this file for the main entry point
 */

var TrickOrTreat = {
    TRICK: 0,
    TREAT: 1
};

var Windows = [
    { x:  72, y: 296, occupied: false },   // Left wall
    { x: 148, y: 296, occupied: false },
    { x: 240, y: 320, occupied: false },   // Door
    { x: 332, y: 296, occupied: false },   // Right wall
    { x: 408, y: 296, occupied: false },
    { x: 109, y: 170, occupied: false },   // Left roof
    { x: 240, y: 232, occupied: false },   // Above door
    { x: 370, y: 170, occupied: false },   // Right roof
    { x: 241, y:  72, occupied: false }    // Loft
];

/*
 * =============================================================================
 * DebugConsole() - simple console display
 * =============================================================================
 */
//{{{
var DebugConsole = function( options ) {
    
    var self = {
        setup: function( options ) {
            this.visible = true;
        },
        
        update: function( ) {
        },
        
        draw: function( ) {
            if (this.visible) {
                // Draw the console background as a semi-transparent rectangle
                // at the top of the screen
                jaws.context.fillStyle = "rgba(128, 128, 128, 0.5";
                jaws.context.fillRect( 0, 0, jaws.width, 64 );
                jaws.context.fillStyle = "#ffffff";
                jaws.context.fillText("Mouse: " + jaws.mouse_x + ", " + jaws.mouse_y, 8, 16);
                jaws.context.fillText("Ticks: " + jaws.game_loop.ticks, 8, 32);
                jaws.context.fillText("FPS: " + jaws.game_loop.fps, 8, 48);
            }
        }
    };
    
    self.setup( options );
    return self;
};
//}}}

/*
 * =============================================================================
 * Countdown() - handles Timer countdowns
 * =============================================================================
 * This is a private class used internally by the Timer object (see below), and
 * holds details of a single countdown
 */
//{{{
Countdown = function(duration) {
    'use strict';
    
    var self = {
        duration: duration,
        active: true,
        expired: false,
        last_tick: jaws.game_loop.current_tick,
        
        // ---------------------------------------------------------------------
        // reset(duration)
        // ---------------------------------------------------------------------
        reset: function(duration) {
            this.duration = duration;
            this.active = true;
            this.expired = false;
            this.last_tick = jaws.game_loop.current_tick;
        },
        
        // -----------------------------------------------------------------------------
        // update()
        // -----------------------------------------------------------------------------
        update: function(tick) {
            if ((!this.expired) && (Math.floor((tick - this.last_tick) / 100) >= 1)) {
                this.last_tick = tick;
                this.duration--;
                if (this.duration <= 0) {
                    this.expired = true;
                }
            }
        },
        
        // -----------------------------------------------------------------------------
        // remove()
        // -----------------------------------------------------------------------------
        remove: function() {
            this.active = false;
        }
    };
    
    return self;
    
};
//}}}

/*
 * =============================================================================
 * Timer() - game timer, stopwatch, and countdown handler
 * =============================================================================
 * Keeps track of the duration of the game and provides countdown and counter
 * facilities.
 *
 * This class has to be slightly tricky because it needs to accommodate the game
 * pausing (when the browser tab loses focus, for example) and to continue the
 * timing correctly when it is unpaused.
 *
 * It also provides a 'counter' facility. Start it using 'startCounter', and
 * then check the 'counter' property to find out how long it has been since the
 * counter was started.
 */
//{{{ 
Timer = function() {
    'use strict';
    
    var self = {

        // Number of seconds since the Timer was created or last reset        
        seconds: 1,
        
        // Collection of active countdowns
        countdowns: [],
        
        // Keep a record of the last game tick so that we can track the time
        last_tick: jaws.game_loop.current_tick,
            
        // ---------------------------------------------------------------------
        // reset()
        // ---------------------------------------------------------------------
        reset: function() {
            'use strict';
            // Set the timer to 1 second (starting from 0 seems to cause issues if
            // you attempt to use mod (%) on the seconds)
            this.seconds = 1;
            this.last_tick = jaws.game_loop.current_tick;
        },
        
        // ---------------------------------------------------------------------
        // update()
        // ---------------------------------------------------------------------
        update: function() {
            'use strict';
            var tick = jaws.game_loop.current_tick;
            // Check the difference between the last tick and the current tick. If
            // amounts to 1 second or more, assume that 1 second has passed. This
            // means that if multiple seconds have passed (because the game has been
            // paused), it will still only count as a single second. This is not
            // exactly accurate, but works well enough for the game.
            this.countdowns.forEach( function(item, total) { item.update(tick); } );
            if (Math.floor((tick - this.last_tick) / 1000) >= 1) {
                this.last_tick = tick;
                this.seconds++;
                if (this.counter >= 0) {
                    if (Math.floor((tick - this.last_counter_tick) / 1000) >= 1) {
                        this.last_counter_tick = tick;
                        this.counter++;
                    }
                }
            }
            this.countdowns = this.countdowns.filter(function(item) { return (item.active); });
        },
        
        // ---------------------------------------------------------------------
        // startCountdown()
        // ---------------------------------------------------------------------
        // Creates and returns a new Countdown.
        startCountdown: function(duration) {
            'use strict';
            var countdown = Countdown(duration);
            this.countdowns.push(countdown);
            return countdown;
        },
        
        // Starts a counter, taking the current second as 0 and counting up each
        // second.
        startCounter: function() {
            this.counter = 0;
            this.last_counter_tick = jaws.game_loop.current_tick;
        },
        
        // Stops the counter.
        stopCounter: function() {
            this.counter = -1;
        },
        
        // Returns True if the counter is active.
        isActive: function() {
            return (this.counter != -1);
        }
    };

    self.reset( );    
    return self;
    
};
//}}}

/*
 * =============================================================================
 * Target() - Handler for the 'trick or treat' sprites
 * =============================================================================
 */
//{{{
var Target = function( options ) {
    
    var self = {
        setup: function( options ) {
            this.sprite = jaws.Sprite( { image: options.image, x: options.x, y: options.y, anchor: "center" } );
            this.images = new jaws.Animation( {sprite_sheet: options.image, frame_size: [this.sprite.height, this.sprite.height], loop: true} );
            this.type = options.type || TrickOrTreat.TRICK;
            this.timer = options.timer;
            this.visible = false;
            this.countdown = null;
        },
        
        update: function() {
            this.sprite.setImage(this.images.next());
            if ( ( this.countdown ) && ( this.countdown.expired ) ) {
                this.hide( );
                this.countdown.active = false
                this.countdown = null;
            }
        },
        
        draw: function() {
            if (this.visible) {
                this.sprite.draw();
            }
        },
        
        on_click: function(x, y) {
            if ( ( this.visible ) && ( this.sprite.rect( ).collidePoint( x, y ) ) ) {
                return true;
            } else {
                return false;
            }
        },
        
        show: function( ) {
            this.visible = true;
            this.select_window( );
            this.countdown = this.timer.startCountdown(10);
        },
        
        hide: function( ) {
            this.visible = false;
            this.window.occupied = false;
        },
        
        select_window: function( ) {
            var idx = Math.floor(Math.random() * (Windows.length));
            var target = Windows[idx];
            while (target.occupied) {
                idx = Math.floor(Math.random() * (Windows.length));
                target = Windows[idx];
            };
            this.window = Windows[idx];
            this.window.occupied = true;
            this.sprite.x = this.window.x;
            this.sprite.y = this.window.y;
        }
    };
    
    self.setup( options );
    return self;
};    
//}}}

/*
 * =============================================================================
 * Targets() - Handles all the targets
 * =============================================================================
 */
//{{{
var Targets = function( options ) {
    
    var self = {
        setup: function( options ) {
            this.list = new jaws.SpriteList( );
            this.timer = options.timer;
            this.treats = 0;
            this.start_countdown( );
        },
        
        add: function( options ) {
            this.list.push( Target( options ) );
        },
        
        update: function() {
            this.list.update( );
            if (this.countdown.expired) {
                this.show();
                this.countdown.active = false;
                this.start_countdown( );
            }
        },
        
        draw: function() {
            this.list.draw( );
        },
        
        show: function() {
            // Select a target
            var idx = Math.floor(Math.random() * (this.list.length));
            var target = this.list.at(idx);
            while (target.visible) {
                idx = Math.floor(Math.random() * (this.list.length));
                target = this.list.at(idx);
            };
            target.show( );
        },
       
        on_click: function( x, y ) {
            this.list.forEach(
                function(ea) { 
                    if ( ea.on_click( x, y ) ) {
                        if (ea.type == TrickOrTreat.TREAT) {
                            self.treats += 1;
                        } else {
                            if (self.treats > 1) {
                                self.treats -= 1;
                            }
                        }
                    }; 
                }
            );
        },
        
        start_countdown: function( ) {
            delay = 10 + Math.floor(Math.random( ) * 30);
            this.countdown = this.timer.startCountdown( delay );
        }
    };
    
    self.setup( options );
    return self;
};    
//}}}

/*
 * =============================================================================
 * Intro() - Intro state handler.
 * =============================================================================
 */
//{{{
var Intro = function() {
    
    var self = {

        // ---------------------------------------------------------------------
        // setup()
        // ---------------------------------------------------------------------
        // Creates and initialises the components. This is called
        // automatically by the jaws library.
        //{{{
        setup: function() {
            // Load the Intro graphic
            this.background = new jaws.Sprite({image: "graphics/intro.png"});

            this.buttonRect = new jaws.Rect(335, 380, 60, 60);
            
            // Direct any mouse-clicks to our onClick event-handler
            jaws.on_keydown(["left_mouse_button", "right_mouse_button"], function(key) { self.on_click(key); });
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // update()
        // ---------------------------------------------------------------------
        // Updates the game components. This is called automatically by the
        // jaws library.
        //{{{        
        update: function() {

        },
        //}}}
        
        // ---------------------------------------------------------------------
        // draw()
        // ---------------------------------------------------------------------
        // Draws the game components. This is called automatically by the jaws
        // library.
        //{{{
        draw: function() {
            this.background.draw();
        },
        //}}}

        // ---------------------------------------------------------------------
        // onClick()
        // ---------------------------------------------------------------------
        // This callback is called by the jaws library when the mouse is 
        // clicked. See the jaws.on_keydown() call in the setup() method.
        //{{{        
        on_click: function(key) {
            var x = jaws.mouse_x;
            var y = jaws.mouse_y;
            if (key === "left_mouse_button") {
                if (this.buttonRect.collidePoint(x, y)) {
                    jaws.switchGameState( Game );
                }                    
            }
        }
        //}}}
    };
    
    return self;
};
//}}}

/*
 * =============================================================================
 * GameOver() - Game Over state handler.
 * =============================================================================
 */
//{{{
var GameOver = function( ) {
    
    var self = {

        // ---------------------------------------------------------------------
        // setup()
        // ---------------------------------------------------------------------
        // Creates and initialises the components. This is called
        // automatically by the jaws library.
        //{{{
        setup: function( options ) {
            // Load the Intro graphic
            this.background = new jaws.Sprite({image: "graphics/house.png"});
            this.buttonRect = new jaws.Rect(160, 400, 160, 56);
            this.treats = options.treats;
            
            // Direct any mouse-clicks to our onClick event-handler
            jaws.on_keydown(["left_mouse_button", "right_mouse_button"], function(key) { self.on_click(key); });
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // update()
        // ---------------------------------------------------------------------
        // Updates the game components. This is called automatically by the
        // jaws library.
        //{{{        
        update: function() {

        },
        //}}}
        
        // ---------------------------------------------------------------------
        // draw()
        // ---------------------------------------------------------------------
        // Draws the game components. This is called automatically by the jaws
        // library.
        //{{{
        draw: function() {
            jaws.context.fillStyle = "#000000";
            jaws.clear( );
            this.background.draw();
            
            jaws.context.font = "24pt Georgia";
            jaws.context.fillStyle = "#335599";
            jaws.context.textAlign = "center";

            jaws.context.strokeStyle = "#335599";
            jaws.context.strokeRect(this.buttonRect.x, this.buttonRect.y, this.buttonRect.width, this.buttonRect.height);
            
            jaws.context.fillStyle = "#5588ee";
            var x = 240;
            var y = 240;
            jaws.context.fillText("Game Over!", x, y);
            y = y + 48;
            jaws.context.fillText("Treats collected: " + this.treats, x, y);
            
            y = 436;
            jaws.context.fillStyle = "#335599";
            jaws.context.fillText("Play Again", x, y);
        },
        //}}}

        // ---------------------------------------------------------------------
        // onClick()
        // ---------------------------------------------------------------------
        // This callback is called by the jaws library when the mouse is 
        // clicked. See the jaws.on_keydown() call in the setup() method.
        //{{{        
        on_click: function(key) {
            var x = jaws.mouse_x;
            var y = jaws.mouse_y;
            if (key === "left_mouse_button") {
                if (this.buttonRect.collidePoint(x, y)) {
                    window.location.reload();
                }
            }
        }
        //}}}
    };

    return self;
};
//}}}

/*
 * =============================================================================
 * Game() - Main game state handler.
 * =============================================================================
 */
//{{{ 
var Game = function() { 
    
    var self = {

        // ---------------------------------------------------------------------
        // Variables
        // ---------------------------------------------------------------------
        //{{{
        
        // Game components. These are actually created and initialised when the
        // init() method is called.
        targets: null,
        //}}}
        
        // ---------------------------------------------------------------------
        // Methods
        // ---------------------------------------------------------------------
        //{{{
        
        // ---------------------------------------------------------------------
        // setup()
        // ---------------------------------------------------------------------
        // Creates and initialises the game components. This is called
        // automatically by the jaws library.
        //{{{
        setup: function() {
            
            var options = { }
            
            // Set up a default font for text output on the canvas
            jaws.context.font      = "12px sans-serif";
            jaws.context.fillStyle = "#ffeecc";
            
            // Load the backdrop for the game
            this.backdrop = new jaws.Sprite({image: "graphics/backdrop.png"});
            this.house = new jaws.Sprite({image: "graphics/house.png"});
            
            this.timer = Timer( );
            this.countdown = this.timer.startCountdown(600);
            
            options.timer = this.timer;
            this.targets = Targets( options );

            options.x = 0;
            options.y = 0;
            
            options.image = "graphics/treat_01.png";
            options.type = TrickOrTreat.TREAT;
            this.targets.add( options );
            
            options.image = "graphics/treat_02.png";
            options.type = TrickOrTreat.TREAT;
            this.targets.add( options );
            
            options.image = "graphics/treat_03.png";
            options.type = TrickOrTreat.TREAT;
            this.targets.add( options );
            
            options.image = "graphics/trick_01.png";
            options.type = TrickOrTreat.TRICK;
            this.targets.add( options );
            
            options.image = "graphics/trick_02.png";
            options.type = TrickOrTreat.TRICK;
            this.targets.add( options );
            
            options.image = "graphics/trick_03.png";
            options.type = TrickOrTreat.TRICK;
            this.targets.add( options );
            
            this.debug = DebugConsole( { } );
            this.debug.visible = false;
            
            // Load and play the game soundtrack
            this.gameTrack = new Audio("sounds/DST-Sarcophage.ogg");
            this.gameTrack.volume = 0.75;
            this.gameTrack.addEventListener("ended", function() {
                this.currentTime = 0;
                this.play();
            }, false);
            this.gameTrack.play();
    
            // Direct any mouse-clicks to our onClick event-handler
            jaws.on_keydown(["left_mouse_button", "right_mouse_button"], function(key) { self.onClick(key); });
        },
        //}}}

        // ---------------------------------------------------------------------
        // update()
        // ---------------------------------------------------------------------
        // Updates the game components. This is called automatically by the
        // jaws library.
        //{{{        
        update: function() {
            this.timer.update( );
            if (this.countdown.expired) {
                this.countdown.active = false;
                jaws.switchGameState( GameOver, null, { treats: this.targets.treats } );
            }
            this.targets.update( );
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // draw()
        // ---------------------------------------------------------------------
        // Draws the game components. This is called automatically by the jaws
        // library.
        //{{{
        draw: function() {
            jaws.context.fillStyle = "#000000";
            jaws.clear( );
            // this.backdrop.draw( );
            this.targets.draw( );
            this.house.draw( );
            
            jaws.context.font = "12pt Georgia";
            jaws.context.fillStyle = "#335599";
            jaws.context.textAlign = "center";

            var x = 240;
            var y = 420;
            jaws.context.fillText("Treats collected: " + this.targets.treats, x, y);
            
            var y = 450;
            jaws.context.fillText("Time remaining: " + Math.floor(this.countdown.duration / 10) + " seconds", x, y);
            
            this.debug.draw();
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // onClick()
        // ---------------------------------------------------------------------
        // This callback is called by the jaws library when the mouse is 
        // clicked. See the jaws.on_keydown() call in the setup() method.
        //{{{        
        onClick: function(key) {
            var x = jaws.mouse_x;
            var y = jaws.mouse_y;
            var target;
            if (key === "left_mouse_button") {
                this.targets.on_click( x, y );
            }
        }
        //}}}
        
        //}}}
    };
    
    return self;
    
};
//}}}

/*
 * =============================================================================
 * Main entry point
 * =============================================================================
 * Loads the game assets and launches the game.
 */
//{{{ 
jaws.onload = function( ) {
    // Pre-load the game assets
    jaws.assets.add( [
            "graphics/intro.png",
            "graphics/backdrop.png",
            "graphics/trick_01.png",
            "graphics/trick_02.png",
            "graphics/trick_03.png",
            "graphics/treat_01.png",
            "graphics/treat_02.png",
            "graphics/treat_03.png",
            "graphics/house.png"
    ] ); 
    // Start the game running. jaws.start() will handle the game loop for us.
    jaws.start( Intro, {fps: 60} ); 
}
//}}}

