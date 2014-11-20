/**
 * This module controls a browser for a specific person
 */
var Zombie = require('zombie'),
    Promise = require('es6-promise').Promise;

// Load the mobile website because it has fewer hacks
var fb_home = 'http://m.facebook.com';

/*********************************** Module ***********************************/

/**
 * The Poker object.
 *   Each method goes back to the Facebook home page (fb_home) after completing
 *   its function.
 */
module.exports = (function () {

  function Poker() {
    this.browser = null;
  }

  /**
   * Init function for the object. Creates a headless browser at the given ip
   *   and logs into Facebook with the given email and password
   * Requires: [string] email - The email address used to login to Facebook
   *           [string] password - The password for the Facebook account
   *           [string] ip - The IP address at which to initialize the browser
   * Returns: [Promise] An initialized Poker object if the login was successful
   *   or false if the login failed.
   */
  Poker.prototype.init = function (email, password, ip) {
    var self = this;
    var browser;

    if (ip) {
      browser = Zombie.create({
        'localAddress': ip
      });
    } else {
      browser = Zombie.create();
    }

    return new Promise(function (resolve, reject) {
      browser
        .visit(fb_home)
        .then(function () {
          // Fill in the credentials
          browser.fill('email', email);
          browser.fill('pass', password);
          return browser.pressButton('Log In');
        })
        .done(function() {
          // Logged in, new page loaded
          // Check if login was successful
          var title = browser.text('title');
          if (title === 'Welcome to Facebook') {
            // Still on login page
            resolve(false);
          } else {
            // Login successful
            self.browser = browser;
            resolve(self);
          }
        });
    });
  }

  /**
   * Pokes someone whose name is the closest match to pokee.
   * Requires: [string] pokee - The name of the person to poke
   * Returns: [Promise] True if the person was poked, otherwise false
   */
  Poker.prototype.poke = function(pokee) {
    var self = this;

    return new Promise(function (resolve, reject) {
      self.browser
        // Fill in the name in the search box and click search
        .fill('query', pokee)
        .pressButton('div#header input[type=submit]')
        .then(function () {
          var firstResult = self.browser.text('div#objects_container tr:nth-child(1) a[class=""]');

          // Visit their profile
          return self.browser.clickLink(firstResult);
        })
        .then(function () {
          // There are two poke buttons on a user's friend's page. One always
          // shows up; we don't want that one. Get the one that's in the
          // timeline header
          var timeline_header = self.browser.query('div#m-timeline-cover-section');
          if (timeline_header) {
            var poke_button = self.browser.link('Poke');
            // Check if the button is a child of the header
            console.log(is_descendant(poke_button, timeline_header));

            if (poke_button) {
              // The poke button exists so click it
              return self.browser.clickLink('Poke');

            } else {
              // There is no poke button, i.e. the person is not friends/not
              // pokeable, etc
              // Go back to the home page
              self.browser.visit(fb_home, function () {
                resolve(false);
              });
            }
          } else {
            // The timeline header doesn't exist, i.e. something is wrong. Just
            // return false
            self.browser.visit(fb_home, function () {
              resolve(false);
            });
          }
        })
        .then(function () {
          // Go back to the home page
          self.browser.visit(fb_home, function () {
            resolve(true);
          });
        });
    });
  }

  return Poker;

})();

/******************************* Local Functions ******************************/
/**
 * Checks whether the given DOM element is a descendant of DOM element parent.
 * Requires: [DOM Node] elm - The element to test
 *           [DOM Node] parent - The element which may be a parent of elm
 * Returns: [boolean] True if elm is a child of parent (or of parent's children,
 *   etc), otherwise false
 */
var is_descendant = function (elm, parent) {
  var node = elm.parentNode;
  while (node != null) {
    if (node == parent) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}