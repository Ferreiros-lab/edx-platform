/**
 * The MoveXblockModal to move XBlocks in course.
 */
define([
    'jquery', 'backbone', 'underscore', 'gettext',
    'js/views/baseview', 'js/views/modals/base_modal',
    'js/models/xblock_info', 'js/views/move_xblock_list', 'js/views/move_xblock_breadcrumb',
    'common/js/components/views/feedback_move',
    'js/views/utils/xblock_utils',
    'edx-ui-toolkit/js/utils/html-utils',
    'edx-ui-toolkit/js/utils/string-utils',
    'text!templates/move-xblock-modal.underscore'
],
function($, Backbone, _, gettext, BaseView, BaseModal, XBlockInfoModel, MoveXBlockListView, MoveXBlockBreadcrumbView,
         MovedAlertView, XBlockViewUtils, HtmlUtils, StringUtils, MoveXblockModalTemplate) {
    'use strict';

    var MoveXblockModal = BaseModal.extend({
        modalSRTitle: gettext('Choose a location to move your component to'),

        events: _.extend({}, BaseModal.prototype.events, {
            'click .action-move': 'moveXBlock'
        }),

        options: $.extend({}, BaseModal.prototype.options, {
            modalName: 'move-xblock',
            modalSize: 'med',
            addPrimaryActionButton: true,
            primaryActionButtonType: 'move',
            primaryActionButtonTitle: gettext('Move')
        }),

        initialize: function() {
            BaseModal.prototype.initialize.call(this);
            this.sourceXBlockInfo = this.options.sourceXBlockInfo;
            this.sourceParentXBlockInfo = this.options.sourceParentXBlockInfo;
            this.XBlockUrlRoot = this.options.XBlockUrlRoot;
            this.outlineURL = this.options.outlineURL;
            this.options.title = this.getTitle();
            this.movedAlertView = null;
            this.moveXBlockBreadcrumbView = null;
            this.moveXBlockListView = null;
            this.fetchCourseOutline();
            this.listenTo(Backbone, 'move:validateMoveOperation', this.validateMoveOperation);
        },

        getTitle: function() {
            return StringUtils.interpolate(
                gettext('Move: {displayName}'),
                {displayName: this.sourceXBlockInfo.get('display_name')}
            );
        },

        getContentHtml: function() {
            return _.template(MoveXblockModalTemplate)({});
        },

        show: function() {
            BaseModal.prototype.show.apply(this, [false]);
            MovedAlertView.prototype.inFocus.apply(this, [this.options.modalWindowClass]);
            this.enableMoveOperation(false);
        },

        hide: function() {
            if (this.moveXBlockListView) {
                this.moveXBlockListView.remove();
            }
            if (this.moveXBlockBreadcrumbView) {
                this.moveXBlockBreadcrumbView.remove();
            }
            BaseModal.prototype.hide.apply(this);
            MovedAlertView.prototype.outFocus.apply(this);
        },

        fetchCourseOutline: function() {
            var self = this;
            $.ajax({
                url: this.outlineURL,
                contentType: 'application/json',
                dataType: 'json',
                type: 'GET'
            }).done(function(outlineJson) {
                $('.ui-loading').addClass('is-hidden');
                $('.breadcrumb-container').removeClass('is-hidden');
                self.renderViews(outlineJson);
            }).fail(function(jqXHR, textStatus, errorThrown) {  // eslint-disable-line no-unused-vars
                // TODO! What to do here???
            });
        },

        renderViews: function(outlineJson) {
            this.moveXBlockBreadcrumbView = new MoveXBlockBreadcrumbView(
                {
                    el: '.breadcrumb-container'
                }
            );
            this.moveXBlockListView = new MoveXBlockListView(
                {
                    el: '.xblock-list-container',
                    model: new XBlockInfoModel(outlineJson, {parse: true})
                }
            );
        },

        enableMoveOperation: function (isValidMove) {
            var $moveButton = this.$el.find('.action-move');
            if (isValidMove){
                $moveButton.removeClass('is-disabled');
            } else {
                $moveButton.addClass('is-disabled');
            }
        },

        validateMoveOperation: function (targetParentXBlockInfo) {
            var isValidMove = false,
                sourceParentType = this.sourceParentXBlockInfo.get('category'),
                targetParentType = targetParentXBlockInfo.get('category');

            if (targetParentType == sourceParentType && this.sourceParentXBlockInfo.id != targetParentXBlockInfo.id) {
                isValidMove = true;
            }
            this.enableMoveOperation(isValidMove);
        },

        showMovedBar: function(title, titleLink, messageLink) {
            var self = this;
            if (self.movedAlertView) {
                self.movedAlertView.hide();
            }
            self.movedAlertView = new MovedAlertView({
                title: title,
                titleLink: titleLink,
                messageLink: messageLink,
                maxShown: 10000
            });
            self.movedAlertView.show();
            // scroll to top
            $.smoothScroll({
                offset: 0,
                easing: 'swing',
                speed: 1000
            });
        },

        moveXBlock: function() {
            var self = this;
            XBlockViewUtils.moveXBlock(self.sourceXBlockInfo.id, self.moveXBlockListView.parent_info.parent.id)
                .done(function(response) {
                    if (response.move_source_locator) {
                        // hide modal
                        self.hide();
                        // hide xblock element
                        $("li.studio-xblock-wrapper[data-locator='" + self.sourceXBlockInfo.id + "']").hide();
                        self.showMovedBar(
                            StringUtils.interpolate(
                                gettext('Success! "{displayName}" has been moved to a new location.'),
                                {
                                    displayName: self.sourceXBlockInfo.get('display_name')
                                }
                            ),
                            StringUtils.interpolate(
                                gettext(' {link_start}Take me there{link_end}'),
                                {
                                    link_start: HtmlUtils.HTML('<a href="/container/' + response.parent_locator + '">'),
                                    link_end: HtmlUtils.HTML('</a>')
                                }
                            ),
                            HtmlUtils.interpolateHtml(
                                HtmlUtils.HTML(
                                    '<a class="action-undo-move" href="#" data-source-display-name="{displayName}" ' +
                                    'data-source-locator="{sourceLocator}" data-parent-locator="{parentLocator}" ' +
                                    'data-target-index="{targetIndex}">{undoMove}</a>'),
                                {
                                    displayName: self.sourceXBlockInfo.get('display_name'),
                                    sourceLocator: self.sourceXBlockInfo.id,
                                    parentLocator: self.sourceParentXBlockInfo.id,
                                    targetIndex: response.source_index,
                                    undoMove: gettext('Undo move')
                                }
                            )
                        );
                    }
                });
        }
    });

    return MoveXblockModal;
});
