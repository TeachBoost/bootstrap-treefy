+function ($) {
    'use strict';

    var Node = function (row) {
        var template = /treetable-/;
        var parentTemplate = /treetable-parent-/;
        this.row = row;
        this.id = null;
        if (template.test(this.row.attr('data-node'))) {
            this.id = this.row.attr('data-node').substring(this.row.attr('data-node').lastIndexOf('-')+1);
        }

        this.parentId = null;
        if (parentTemplate.test(this.row.attr('data-pnode'))) {
            this.parentId = this.row.attr('data-pnode').substring(this.row.attr('data-pnode').lastIndexOf('-')+1);
        }
        this.children = [];
        this.status = true;
    }


    Node.prototype.addChildren = function(treeContainer) {
        var self = this;
        var templateData = "treetable-parent-" + self.id;
        var $children = treeContainer.find('[data-pnode="' + templateData + '"]');
        if ($children.length != 0) {
            $.each($children, function(i, child) {
                var childNode = new Node($(child));
                self.children.splice(0, 0, childNode);
                childNode.addChildren(treeContainer);
            });
        }
    }

    Node.prototype.initIndent = function(tableTreeify) {
        var depth = this.getDepth(tableTreeify.$table);
        this.row.addClass( 'treetable-depth-' + depth );
    }

    Node.prototype.initExpander = function(tableTreeify) {
        var self = this;
        var element = self.row.find('td').get(tableTreeify.options.treeColumn);
        var $expander = self.row.find('.treetable-expander');
        if ($expander) {
            $expander.remove();
        }
        var expanderTemplate = tableTreeify.options.expanderTemplate;
        $(expanderTemplate).prependTo(element).click(function(event) {
            //self.toggle($(this).closest('tr'));
            self.toggle();
        });
    }

    Node.prototype.renderExpand = function(tableTreeify) {
        var $expander = this.row.find('.treetable-expander');
        if ($expander) {
            if (!this.row.hasClass('treetable-collapsed')) {
                $expander.removeClass(tableTreeify.options.expanderCollapsedClass);
                $expander.addClass(tableTreeify.options.expanderExpandedClass);
            } else {
                $expander.removeClass(tableTreeify.options.expanderExpandedClass);
                $expander.addClass(tableTreeify.options.expanderCollapsedClass);
            }
        } else {
            this.initExpander(tableTreeify);
            this.renderExpand(tableTreeify);
        }
    }

    Node.prototype.toggle = function() {
        if (this.row.hasClass('treetable-expanded')) {
            if (!this.isLeaf() && !this.row.hasClass('treetable-collapsed')) {
                this.row.removeClass('treetable-expanded');
                this.row.addClass('treetable-collapsed');
            }
        } else {
            if (!this.isLeaf() && !this.row.hasClass('treetable-expanded')) {
                this.row.removeClass('treetable-collapsed');
                this.row.addClass('treetable-expanded');
            }
        }
    }


    /* 是否为叶子节点 */
    Node.prototype.isLeaf = function() {
        return this.children.length === 0;
    }

    Node.prototype.isCollapsed = function(treeContainer) {
        var isRoot = (this.getDepth(treeContainer) === 0);
        if (isRoot) {
            return false;
        } else {
            if (this.getParentNode(treeContainer).row.hasClass('treetable-collapsed')) {
                return true;
            } else {
                return this.getParentNode(treeContainer).isCollapsed(treeContainer);
            }
        }
    }

    Node.prototype.getDepth = function(treeContainer) {
        if (this.getParentNode(treeContainer) === null) {
            return 0;
        }
        return this.getParentNode(treeContainer).getDepth(treeContainer) + 1;
    }

    Node.prototype.getParentNode = function(treeContainer)　{
        if (this.parentId === null) {
            return null;
        } else {
            return this.getNodeById(this.parentId, treeContainer);
        }
    }

    Node.prototype.getNodeById = function(id, treeContainer) {
        var templateData = "treetable-" + id;
        var $row = treeContainer.find('[data-node="' + templateData + '"]');
        var node = new Node($row);
        node.addChildren(treeContainer);
        return node;
    }

    var TableTreeify = function (element, options) {
        this.options = options;

        this.$table = $(element);

        var allNodes = this.getAllNodes();
        this.initTree(allNodes);

    }

    TableTreeify.VERSION = '0.0.1'

    TableTreeify.prototype.getAllNodes = function() {
        var self = this;
        var result = $.grep(self.$table.find('tr'), function(trElement) {
            var nodeData = $(trElement).attr('data-node');
            var template = /treetable-/;
            return template.test(nodeData);
        });
        var $allNodes = $(result);
        var allNodes = [];
        $.each($allNodes, function() {
            var node = new Node($(this));
            node.addChildren(self.$table);
            allNodes.push(node);
        });
        return allNodes;
    }

    TableTreeify.prototype.initTree = function(allNodes) {
        var self = this;
        var rootNodes = [];
        $.each(allNodes, function() {
            var noChildren = this.children.length === 0;
            if (!noChildren) {
                this.row.addClass(self.options.initStatusClass);
            }
            if (!this.parentId) {
                rootNodes.push(this);
            }
        });
        self.initNode(rootNodes);
        self.render(rootNodes);
    }

    TableTreeify.prototype.initNode = function(nodes) {
        var self = this;
        $.each(nodes, function() {
            var rootNode = this.row;
            $.each(this.children, function() {
                rootNode.after(this.row);
            });
            self.initNode(this.children);
            this.initExpander(self);
            this.initIndent(self);
            var $row = this.row;
            var click_nodes = [];
            click_nodes.push(this);
            $row.find('.treetable-expander').on("click", function(event) {
                event.stopPropagation();
                self.render(click_nodes);
            });
        });
    }

    TableTreeify.prototype.render = function(nodes) {
        var self = this;
        $.each(nodes, function(node) {
            //若父节点折叠, 隐藏子节点
            if (this.isCollapsed(self.$table)) {
                this.row.addClass( 'hidden' );
            } else {
                this.row.removeClass( 'hidden' );
            }
            if (!this.isLeaf()) {
                this.renderExpand(self);
                self.render(this.children);
            }
        })
    }


    // PLUGIN DEFINITION
    // =======================

    function Plugin(option) {
        var args = arguments;
        var ret;
        return this.each(function () {
            var $this = $(this)
            var data  = $this.data('tableTreeify')

            if (!data) {
                var options = $.extend(true, {}, $.fn.tableTreeify.defaults, typeof option == 'object' && option);
                $this.data('tableTreeify', (data = new TableTreeify(this, options)));
            }
            if (typeof option == 'string') data[option].call($this)
        })

        if (typeof option == 'string') {
            if (args.length == 1) {
                var _ret = data[option].call(data);
                if (typeof _ret != 'undefined') {
                    ret = _ret;
                }
            } else {
                var _ret = data[option].apply(data, Array.prototype.slice.call(args, 1));
                if (typeof _ret != 'undefined') {
                    ret = _ret;
                }
            }
        }

        if (typeof ret != 'undefined') {
            return ret;
        }
        return this;
    }

    var old = $.fn.tableTreeify

    $.fn.tableTreeify             = Plugin
    $.fn.tableTreeify.Constructor = TableTreeify
    $.fn.tableTreeify.defaults = {

        expanderTemplate: '<span class="treetable-expander"></span>',

        indentTemplate: '<span class="treetable-indent"></span>',

        expanderExpandedClass: 'fa fa-angle-down',

        expanderCollapsedClass: 'fa fa-angle-right',

        treeColumn: 0,

        initStatusClass: 'treetable-expanded'
    }


    // ALERT NO CONFLICT
    // =================

    $.fn.tableTreeify.noConflict = function () {
        $.fn.tableTreeify = old
        return this
    }

}(jQuery);