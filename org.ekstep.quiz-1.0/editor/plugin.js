/**
 * 
 * plugin to add assessments to stage
 * @class assessment
 * @extends EkstepEditor.basePlugin
 * @author Manju dr <manjunathd@ilimi.in>
 * @fires org.ekstep.assessmentbrowser:show
 * @fires org.ekstep.quiz:add 
 * @listens org.ekstep.image:assessment:showPopup
 */
EkstepEditor.basePlugin.extend({
    /**
     * This expains the type of the plugin 
     * @member {String} type
     * @memberof assessment
     */
     type: "org.ekstep.quiz",    
    /**
    *  
    * Registers events.
    * @memberof assessment
    */
    initialize: function() {
        EkstepEditorAPI.addEventListener(this.manifest.id + ":showPopup", this.openAssessmentBrowser, this);
        EkstepEditorAPI.addEventListener(this.manifest.id + ":renderQuiz", this.renderQuiz, this);
    },
    newInstance: function() {
        var instance = this;
        if (!instance.attributes.w) {
            instance.attributes.w = instance.attributes.h = 80;
        }
        instance.percentToPixel(instance.attributes);
        var props = instance.convertToFabric(instance.attributes),
        questionnaire = instance.data.questionnaire, 
        count = questionnaire.total_items + '/' + instance.get(questionnaire.items),
        templateIds = instance.get(questionnaire.items,"templateId");
        instance.get(questionnaire.items,"media").forEach( function(element, index) {
           instance.addMediatoManifest(element);
        });
        var templateArray = [],templates = [],resCount = 0,tempaltesLength = templateIds.length;
        if (_.isUndefined(this.data.template)) {
            for (var index = 0; index < tempaltesLength; index++) {
                if (!_.isUndefined(templateIds[index])) {
                    EkstepEditor.assessmentService.getTemplate(templateIds[index], function(err, res) {
                        try {
                            if (!err && res) {
                                resCount++;
                                templateArray.push(instance.xml2json(res));
                                if (resCount == tempaltesLength) {
                                    templateArray.forEach(function(element, index) {
                                        if (!_.isNull(element)) {
                                            templates.push(element.template);
                                            if (!_.isUndefined(element.manifest)) {
                                                instance.addMediatoManifest(element.manifest.media);
                                            }
                                        }
                                    });
                                    instance.data.template = templates;
                                }
                            }else{
                               throw Error(res);
                            }
                        }
                        catch(err){
                            console.warn("Template is invalid Please choose the another Template",err);
                        } 
                    });
                }
            }
        }
      instance.editorObj = instance.showProperties(props, questionnaire.title, count, questionnaire.max_score);
    },
    get: function(items, type) {
        // it returns the Unique templateId || media of the questions || length of the question
        var question = [], media = [];
        for (var key in items) {
            question = items[key];
        }
        if (type === "templateId") {
            return _.uniq(_.filter(_.map(question, "template_id"), Boolean));

        } else if (type === 'media') {
            for (var i = 0; i < question.length; i++) {
                media.push(question[i].media);
            }
            return media;
        } else {
            return question.length;
        }
    },
    renderQuiz: function(event, assessmentData) {
        var instance = this,question = [];
        _.each(assessmentData.items, function(item) {
            if (!_.isUndefined(item.question)) {
                item.question = instance.parseObject(item.question);
            }
            question.push(item.question);
        });
        instance.setQuizdata(question, assessmentData.config);
    },
    setQuizdata: function(question, attributes) {
        // constuction of the questionnaire
        var instance = this, questionSets = {}, configItem = {},questionnaire = {},_assessmentData = {};
        questionSets[question[0].identifier] = question;
        configItem["items"] = questionSets;
        configItem["item_sets"] = [{"count": attributes.total_items,"id": question[0].identifier}];
        questionnaire["questionnaire"] = Object.assign(configItem, attributes);
        var configData = {__cdata : JSON.stringify({"type": "items","var": "item"})};
        var dataObj = {__cdata : JSON.stringify(questionnaire)};
        instance.setConfig({"type": "items","var": "item"});
        instance.setData(questionnaire);
        _assessmentData["data"] = dataObj;
        _assessmentData["config"] = configData;
        EkstepEditorAPI.dispatchEvent(instance.manifest.id + ':create', _assessmentData);
    },
    parseObject: function(item) {
        $.each(item, function(key, value) {
            if (key === 'options' || key === "lhs_options" || key === 'rhs_options' || key === 'model' || key === 'answer' || key === 'media') {
                item[key] = !_.isObject(item[key]) ? JSON.parse(item[key]) : item[key];
            }
        });
        return item;
    },
    addMediatoManifest: function(media) {
        // it will add the all media to the manifest
        var instance = this;
        if (!_.isUndefined(media)) {
            if (_.isArray(media)) {
                media.forEach(function(ele, index) {
                    if (!_.isNull(media[index].id)) {
                        instance.addMedia(media[index]);
                    }
                });
            } else {
                instance.addMedia(media);
            }
        }
    },
    xml2json: function(res) {
        var data, x2js = new X2JS({
            attributePrefix: 'none'
        });
        if (!_.isNull(res)) {
            data = x2js.xml_str2json(res.data.result.content.body);
            return data.theme;
        }
    },
    showProperties: function(props, qTittle, qCount, maxscore) {
        // Display the all properties on the editor
        props.fill = "#87CEFA";
        var rect = new fabric.Rect(props);
        qTittle = new fabric.Text("TITLE :"+ qTittle.toUpperCase(), {fontSize: 25, fill:'black',textAlign:'center',textDecoration:'underline', top: 80, left: 160} );
        qCount = new fabric.Text("QUESTIONS : " + qCount, {fontSize: 20,fill:'black',top: 120,left: 160});
        maxscore = new fabric.Text("TOTAL MARKS : "+maxscore, {fontSize: 20, fill:'black', top: 150,left: 160,});
        fabricGroup = new fabric.Group([rect, qTittle, qCount, maxscore], {left: 90, top: 40});
        return fabricGroup;
    },
    /**    
    *      
    * open assessment browser to get assessment data. 
    * @memberof assessment
    * 
    */
    openAssessmentBrowser: function(event, callback) {
        var instance = this;
        var callback = function(items, config) {
            var set = {items: items, config: config};
            EkstepEditorAPI.dispatchEvent(instance.manifest.id + ':renderQuiz', set);
        };
        EkstepEditorAPI.dispatchEvent("org.ekstep.assessmentbrowser:show", callback);
    }
});
//# sourceURL=quizPlugin.js