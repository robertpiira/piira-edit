/*jshint strict:true, devel:true, browser:true, indent:2, multistr:true */

// piiraEdit
// version:    0.1
// author:     @robertpiira

(function (doc, win) {

  'use strict';

  var piiraEdit = {};

  piiraEdit.prefix = 'piira-edit';

  piiraEdit.cssInspector = {

    init: function () {

      this.allRules = [];
      this.states = { inspectorActive: false };
      this.settings = { styleBoxWidth: 320, barWidth: 8 };
      this.urls = { css: 'http://piira.se/piira-edit-js/piira-edit.css' };

      this.includeCss();
      this.collectRules();
      this.createInspectorButton();
      this.createMenu();
      this.createDragbar();
      this.addHandlers();

    },

    includeCss: function () {

      var ref = doc.createElement('link');

      ref.href = this.urls.css;
      ref.rel = 'stylesheet';
      doc.body.appendChild(ref);

    },

    createInspectorButton: function () {

      this.inspectorButton = doc.createElement('button');
      this.inspectorButton.setAttribute('class', piiraEdit.prefix + '-inspector-button');
      this.inspectorButton.innerHTML = 'Inspect';

    },

    createMenu: function () {

      this.menu = doc.body.appendChild(doc.createElement('div'));
      this.menu.setAttribute('class', piiraEdit.prefix + '-menu');

      this.menu.appendChild(this.inspectorButton);

    },

    createDragbar: function () {

      this.dragbar = doc.body.appendChild(doc.createElement('div'));
      this.dragbar.setAttribute('class', piiraEdit.prefix + '-dragbar');

    },

    addHandlers: function () {

      var self = this;
      var evt = doc.createEvent('Event');

      var piiraEditDrag = function () {
        self.states.dragbarMoving = true;
      };

      var piiraEditStopdrag = function () {
        self.states.dragbarMoving = false;
      };

      var piiraEditMove = function (e) {
        e.preventDefault();
        if (self.states.dragbarMoving) {
          self.dragDistance = win.innerWidth - e.pageX + 'px';
          self.bodySpace = e.pageX - self.settings.barWidth + 'px';
          doc.dispatchEvent(evt);
        }
      };

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

      this.dragbar.addEventListener('mousedown', piiraEditDrag, false);
      win.addEventListener('mouseup', piiraEditStopdrag, false);
      win.addEventListener('mousemove', piiraEditMove, false);
  
      evt.initEvent('listenToDrag', true, true);

      doc.addEventListener('listenToDrag', function () {
        self.menu.style.width = self.dragDistance;
        piiraEdit.styler.styleBox.style.width = self.dragDistance;
        doc.documentElement.style.width = self.bodySpace;
        self.dragbar.style.right = self.dragDistance;
      }, false);

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
        piiraEdit.styler.styleBox.value += '\n\n' + '/* selector not found */';
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

    isNotExternalSheet: function (url) {

      var stripDown = function (href) {
        return href.replace("http://").replace("https://").split("/")[0];
      };

      return (stripDown(location.href) === stripDown(url));
    },

    collectRules: function () {

      var sheets = doc.styleSheets;
      var sheet;
      var rules;
      var rule;
      var mediaRule;
      var sheetsLength = sheets.length;
      var i;
      var key;

      for (i = 0; i < sheetsLength; i++) {

        sheet = sheets[i];

        if (sheet.href && this.isNotExternalSheet(sheet.href)) {
          rules = sheet.cssRules;

          for (key in rules) {
            rule = rules[key];

            if (rule && rule.cssText) {
              this.allRules.push(rule);

              // Also check for rules in mediaLists
              if (rule.cssRules) {
                for (mediaRule in rule.cssRules) {
                  if (rule.cssRules[mediaRule].cssText) {
                    this.allRules.push(rule.cssRules[mediaRule]);
                  }
                }
              }
            }
          }
        }

      }

    },

    findRule: function (selector, prefix) {

      var found = false;
      var i;
      var cssText;

      for (i = 0; i < this.allRules.length; i++) {
        
        if (this.allRules[i].selectorText && this.allRules[i].selectorText.indexOf(prefix + selector) !== -1) {
          
          cssText = this.allRules[i].cssText;

          if (this.allRules[i].parentRule) {
            cssText = '@media ' + this.allRules[i].parentRule.media.mediaText + ' {\n' + this.allRules[i].cssText + '\n\n}';
          }

          piiraEdit.styler.styleBox.value += '\n\n' + this.processRule(cssText);
          found = true;
        }
        
      }

      if (!found) {
        piiraEdit.styler.styleBox.value += '\n\n' + prefix + selector + ' {\n  \n}';
      }

    },

    processRule: function (style) {

      var processedStyle = style
                            .split('{')
                            .join('{\n ')
                            .split(';')
                            .join(';\n ')
                            .replace('  }', '}');

      return processedStyle;

    }

  };

  piiraEdit.styler = {

    init: function () {

      this.styleBox = doc.body.appendChild(doc.createElement('textarea'));
      this.styleParent = doc.body.appendChild(doc.createElement('style'));
      this.guiParent = doc.body.appendChild(doc.createElement('style'));

      this.styleBox.setAttribute('id', piiraEdit.prefix + '-style-box');
      this.styleBox.setAttribute('class', piiraEdit.prefix + '-style-box');
      this.styleBox.setAttribute('autocorrect', 'off');

      this.stylerGui();
      this.addHandlers();
      this.getSavedStyles();

    },

    getSavedStyles: function () {

      var storedStyles = localStorage.getItem('piira-edit-saved-styles');
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

      localStorage.setItem('piira-edit-saved-styles', code + '');

    },

    stylerGui: function () {

      var styleBoxLooks = '.' + piiraEdit.prefix + '-style-box {\
        width: ' + piiraEdit.cssInspector.settings.styleBoxWidth + 'px;\
        }\
        .' + piiraEdit.prefix + '-menu {\
        width: ' + piiraEdit.cssInspector.settings.styleBoxWidth + 'px;\
        }\
        .' + piiraEdit.prefix + '-dragbar {\
        width: ' + piiraEdit.cssInspector.settings.barWidth + 'px;\
        right: ' + piiraEdit.cssInspector.settings.styleBoxWidth + 'px;\
        }\
        html {\
        width: ' + (win.innerWidth - (piiraEdit.cssInspector.settings.styleBoxWidth + piiraEdit.cssInspector.settings.barWidth)) + 'px;\
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

})(document, window);
