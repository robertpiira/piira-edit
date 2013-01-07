/*jshint strict:true, devel:true, browser:true, indent:2, multistr:true */

// piiraEdit
// version:    0.1
// author:     @robertpiira

(function (doc) {

  'use strict';

  var piiraEdit = {};

  piiraEdit.prefix = 'piira-edit';

  piiraEdit.cssInspector = {

    init: function () {

      this.allRules = [];
      this.states = { inspectorActive: false };

      this.collectRules();
      this.createInspectorButton();
      this.addHandlers();

    },

    createInspectorButton: function () {

      this.inspectorButton = doc.body.appendChild(doc.createElement('button'));
      this.inspectorButton.setAttribute('class', piiraEdit.prefix + '-inspector-button');
      this.inspectorButton.innerHTML = 'Inspect';

    },

    addHandlers: function () {

      var self = this;

      this.inspectorButton.addEventListener('click', function () {

        if (self.states.inspectorActive === false) {
          self.states.inspectorActive = true;
          doc.body.addEventListener('click', self.getSelector, false);
          
          // add crosshair to cursor
          piiraEdit.styler.guiParent.appendChild(doc.createTextNode('* { cursor: crosshair }'));
          self.inspectorButton.classList.add(piiraEdit.prefix + '-inspector-button-active');
          self.inspectorButton.innerHTML = 'Inspecting';
        } else {
          self.states.inspectorActive = false;
          doc.body.removeEventListener('click', self.getSelector, false);

          // Reset gui to default styles
          piiraEdit.styler.stylerGui();
          self.inspectorButton.classList.remove(piiraEdit.prefix + '-inspector-button-active');
          self.inspectorButton.innerHTML = 'Inspect';
        }

      });

    },

    getSelector: function (e) {

      var element = e.target;
      var selectors = [];
      var prefix;
      var i;

      if (element.getAttribute('class')) {
        selectors = element.getAttribute('class').split(' ');
        prefix = '.';
      } else if (element.getAttribute('id')) {
        selectors.push(element.getAttribute('id'));
        prefix = '#';
      } else {
        console.log('No selector found');
      }

      if (selectors.length > 0) {
        for (i = 0; i < selectors.length; i++) {
          if (selectors[i].indexOf(piiraEdit.prefix) === -1) {
            piiraEdit.cssInspector.findRule(selectors[i], prefix);
          }
        }
      }

      e.preventDefault();
      
    },

    collectRules: function () {

      var sheets = doc.styleSheets;
      var rule = null;
      var rules = null;
      var sheetsLength = sheets.length;
      var i;
      var key;

      for (i = 0; i < sheetsLength; i++) {
        rules = sheets[i].cssRules;

        for (key in rules) {
          rule = rules[key];
          if (rule && rule.cssText) {
            this.allRules.push(rule);
          }
        }

      }

    },

    findRule: function (selector, prefix) {

      var found = false;
      var i;

      for (i = 0; i < this.allRules.length; i++) {
        
        if (this.allRules[i].selectorText === prefix + selector) {
          piiraEdit.styler.styleBox.value += '\n\n' + this.processRule(this.allRules[i].cssText);
          found = true;
        }
        
      }

      if (!found) {
        piiraEdit.styler.styleBox.value += '\n\n' + prefix + selector + ' {\n  \n}';
      }

    },

    processRule: function (style) {

      var processedStyle = style.split('{').join('{\n ').split(';').join(';\n ').replace('  }', '}');

      return processedStyle;

    }

  };

  piiraEdit.styler = {

    init: function () {

      this.styleBox = doc.body.appendChild(doc.createElement('textarea'));
      this.styleParent = doc.head.appendChild(doc.createElement('style'));
      this.guiParent = doc.head.appendChild(doc.createElement('style'));

      this.styleBox.setAttribute('id', piiraEdit.prefix + '-style-box');
      this.styleBox.setAttribute('class', piiraEdit.prefix + '-style-box');
      this.styleBox.setAttribute('autocorrect', 'off');

      this.stylerGui();
      this.addHandlers();
      this.getSavedStyles();

    },

    getSavedStyles: function () {

      var storedStyles = localStorage.getItem('saved-styles');
      if (storedStyles) {
        this.styleBox.value = storedStyles;
        this.pickStyles(storedStyles);
      }

    },

    addHandlers: function () {

      var self = this;

      this.styleBox.addEventListener('keyup', function () {
        self.pickStyles(this.value);
        self.saveStyles(this.value);
      });

    },

    pickStyles: function (style) {

      this.styleParent.innerHTML = style;

    },

    saveStyles: function (code) {

      localStorage.setItem('saved-styles', code + '');

    },

    stylerGui: function () {

      var styleBoxLooks = '.' + piiraEdit.prefix + '-style-box {\
        position: fixed;\
        bottom: 0;\
        right: 0;\
        top: 0;\
        width: 320px;\
        padding: 40px 20px;\
        height: 100%;\
        cursor: text !important;\
        background: rgba(0, 0, 0, .75);\
        color: rgba(255, 255, 255, .8);\
        -webkit-box-sizing: border-box;\
        -webkit-font-smoothing: antialiased;\
        font-size: 13px;\
        font-family: verdana;\
        border: none;\
        outline: none;\
        }\
        html {\
        padding-right: 320px;\
        }\
        .' + piiraEdit.prefix + '-inspector-button {\
        position: fixed;\
        top: 0;\
        right: 0;\
        width: 320px;\
        z-index: 1;\
        margin: 0;\
        cursor: pointer !important;\
        background: rgb(170, 170, 160);\
        border: none;\
        -webkit-box-sizing: border-box;\
        -moz-box-sizing: border-box;\
        box-sizing: border-box;\
        }\
        .' + piiraEdit.prefix + '-inspector-button-active {\
        background: rgb(210, 210, 200) !important;\
        -webkit-animation: active 1s infinite alternate;\
        -moz-animation: active 1s infinite alternate;\
        animation: active 1s infinite alternate;\
        }\
        @-webkit-keyframes active {\
        to {background: rgb(170, 170, 160);}\
        }\
        @-moz-keyframes active {\
        to {background: rgb(170, 170, 160);}\
        }\
        @keyframes active {\
        to {background: rgb(170, 170, 160);}\
        }\
        ';

      this.guiParent.innerHTML = styleBoxLooks;

    }

  };

  piiraEdit.styleInput = {

    init: function () {

      // Give the 'styleBox' basic tab-functionality
      // author: https://github.com/joaocolombo
      // via: https://gist.github.com/2628879

      this.extendStyleBox();
      this.tabbifyStyleBox();

    },

    extendStyleBox: function () {

      piiraEdit.styler.styleBox.getCaretPosition = function () {
        //return the caret position of the textarea
        return this.selectionStart;
      };

      piiraEdit.styler.styleBox.setCaretPosition = function (position) {
        //change the caret position of the textarea
        this.selectionStart = position;
        this.selectionEnd = position;
        this.focus();
      };

    },

    tabbifyStyleBox: function () {

      var textarea = piiraEdit.styler.styleBox;

      textarea.onkeydown = function (event) {

        var newCaretPosition;
          
        //support tab on textarea
        if (event.keyCode === 9) {
          //tab was pressed
          newCaretPosition = textarea.getCaretPosition() + "  ".length;
          textarea.value = textarea.value.substring(0, textarea.getCaretPosition()) + "  " + textarea.value.substring(textarea.getCaretPosition(), textarea.value.length);
          textarea.setCaretPosition(newCaretPosition);
          return false;
        }

        if (event.keyCode === 8) {
          //backspace
          if (textarea.value.substring(textarea.getCaretPosition() - 2, textarea.getCaretPosition()) === "  ") {
            //it's a tab space
            newCaretPosition = textarea.getCaretPosition() - 1;
            textarea.value = textarea.value.substring(0, textarea.getCaretPosition() - 1) + textarea.value.substring(textarea.getCaretPosition(), textarea.value.length);
            textarea.setCaretPosition(newCaretPosition);
          }
        }

        if (event.keyCode === 37) {
          //left arrow
          if (textarea.value.substring(textarea.getCaretPosition() - 2, textarea.getCaretPosition()) === "  ") {
            //it's a tab space
            newCaretPosition = textarea.getCaretPosition() - 1;
            textarea.setCaretPosition(newCaretPosition);
          }
        }

        if (event.keyCode === 39) {
          //right arrow
          if (textarea.value.substring(textarea.getCaretPosition() + 2, textarea.getCaretPosition()) === "  ") {
            //it's a tab space
            newCaretPosition = textarea.getCaretPosition() + 1;
            textarea.setCaretPosition(newCaretPosition);
          }
        }

      };

    }

  };

  piiraEdit.cssInspector.init();
  piiraEdit.styler.init();
  piiraEdit.styleInput.init();

})(document);
