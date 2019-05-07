var SkillTree = angular.module('skillTree', ['ngRoute']);

SkillTree.controller('skillTreeController', ['$scope', '$http', '$window', '$location', '$route', function($scope, $http, $window, $location, $route) {
    //Disable reload on path change
    var original = $location.path;
    $location.path = function (path, reload) {
        if (reload === false) {
            var lastRoute = $route.current;
            var un = $scope.$on('$locationChangeSuccess', function () {
                $route.current = lastRoute;
                un();
            });
        }
        return original.apply($location, [path]);
    };

    
    //Load Skill Data
    $http.get($window.folderName + '/Skills.json')
        .then(function(skills){

            //Skill Initialization
            $scope.skills = skills.data;
           
            //Load Meta Data
            $http.get($window.folderName + '/Meta.json')
            .then(function(meta){
                //initialize skill points
                $scope.skillPoints = {
                    "initialSP": parseInt(meta.data.initialSP),
                    "totalSkillPoints": parseInt(meta.data.initialSP) + 1,
                    "usedSkillPoints": 0
                }

                //This object will contain a list of all the skills on screen and their allocation
                $scope.skillAllocation = {};

                //initialize classes
                $scope.class = {
                    "selected": meta.data.initialClass,
                    "classes": [],
                    "classData": {}
                };

                //initialize level selector
                $scope.level = {
                    "selected": 1,
                    "levels": []
                }
                for(var i = 1; i <= meta.data.maxLevel; i++) {
                    $scope.level.levels.push(i);
                };

                //initialize retirement selector
                $scope.retirement = {
                    "selected": meta.data.initialRetirementData,
                    "retirements": [],
                    "retirementData": meta.data.retirementData
                }
                for(var keyName in meta.data.retirementData) {
                    var key = keyName;
                    $scope.retirement.retirements.push(key);
                }

                //Load Class Data
                $http.get($window.folderName + '/Classes.json')
                .then(function(classes){
                    //More class initialization
                    for(var keyName in classes.data) {        
                        var key = keyName;
                        $scope.class.classes.push(key);
                    };
                    $scope.class.classData = classes.data;

                    //Try to init after everything is loaded
                    init();
                });
            });
        });
            
    //Save
    $scope.saveData = {};
    $scope.save = function() {
        $scope.saveData = {};
        $scope.saveData.Skills = [];
        for (var skill in $scope.skillAllocation) {
            $scope.saveData.Skills.push($scope.skillAllocation[skill]);
        }
        $scope.saveData.Class = $scope.class.selected;
        $scope.saveData.Level = $scope.level.selected;
        $scope.saveData.Retirement = $scope.retirement.selected;
        saveData =LZString.compressToEncodedURIComponent(angular.toJson($scope.saveData));
        return saveData;
    }

    //Load if Possible
    var init = function() {
        query = $location.path().substring(1, $location.path().length);
        $scope.saveData = angular.fromJson(LZString.decompressFromEncodedURIComponent(query));
        if ($scope.saveData != null) {
            $scope.class.selected = $scope.saveData.Class;
            $scope.level.selected = $scope.saveData.Level;
            $scope.retirement.selected = $scope.saveData.Retirement;

            var i = 0;
            for (var skill in $scope.class.classData[$scope.class.selected].skills) {
                $scope.skillAllocation[$scope.class.classData[$scope.class.selected].skills[skill]] = $scope.saveData.Skills[i];
                $scope.skillPoints.usedSkillPoints += $scope.saveData.Skills[i] == undefined ? 0 : $scope.saveData.Skills[i];
                i++;
            }
            
            var retiredSp = $scope.retirement.retirementData[$scope.retirement.selected];
            retiredSp = undefined ? '0' : retiredSp;
            $scope.skillPoints.totalSkillPoints = parseInt($scope.skillPoints.initialSP) + parseInt($scope.level.selected) + parseInt(retiredSp);
        }
    };

    $scope.updateClass = function() {
        $scope.skillAllocation = {};
        for (var skill in $scope.class.classData[$scope.class.selected].skills) {
            $scope.skillAllocation[$scope.class.classData[$scope.class.selected].skills[skill]] = 0;
        }
        $scope.skillPoints.usedSkillPoints = 0;
        newUrl = $scope.save();
        $location.path(newUrl, false);
    }

    //Update skill points when selected level or retirement is changed
    $scope.updateSP = function() {
        var retiredSp = $scope.retirement.retirementData[$scope.retirement.selected];
        retiredSp = undefined ? '0' : retiredSp;
        $scope.skillPoints.totalSkillPoints = parseInt($scope.skillPoints.initialSP) + parseInt($scope.level.selected) + parseInt(retiredSp);

        newUrl = $scope.save();
        $location.path(newUrl, false);
    };

    //Increase point in a skill
    $scope.increasePoint = function(skill, points) {
        for (upstream in $scope.skills[skill].Upstream) {
            if ($scope.skillAllocation[upstream] < $scope.skills[skill].Upstream[upstream]){
                $scope.increasePoint(upstream, $scope.skills[skill].Upstream[upstream] - $scope.skillAllocation[upstream]);
            }
        }
        if($scope.skillAllocation[skill] < $scope.skills[skill].MaxLevel) {
            $scope.skillAllocation[skill] += points;
            $scope.skillPoints.usedSkillPoints += points;
        }
        
        newUrl = $scope.save();
        $location.path(newUrl, false);
    }

    //Decrease point in a skill
    $scope.decreasePoint = function(skill, points) {
        if($scope.skillPoints.usedSkillPoints > 0 && $scope.skillAllocation[skill] >= points) {
            $scope.skillAllocation[skill] -= points;
            $scope.skillPoints.usedSkillPoints -= points;
        }

        for (downstream in $scope.skills[skill].Downstream) {
            if ($scope.skillAllocation[downstream] > 0 && $scope.skillAllocation[skill] < $scope.skills[downstream].Upstream[skill]){
                $scope.decreasePoint(downstream, $scope.skillAllocation[downstream]);
            }
        }
        newUrl = $scope.save();
        $location.path(newUrl, false);
    }

    //Disable a skill
    $scope.shouldDisable = function(skill) {
        for (upstream in $scope.skills[skill].Upstream) {
            if ($scope.skillAllocation[upstream] < $scope.skills[skill].Upstream[upstream]){
                return true;
            }
        }
        return false;
    }

    //Draw line and level requirement
    $scope.drawLine = function(skill, element) {
        for (upstream in $scope.skills[skill].Upstream) {
            template = '<svg class="line" width="800" height="575"><marker id="mid" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="navy" /></marker>'
             + '<polyline id="' + upstream + '-' + skill + '" marker-mid="url(#mid)"  points="' + (180 * parseInt($scope.skills[upstream].Location.x) + 55)
             + ',' + (70 + 100 * parseInt($scope.skills[upstream].Location.y)) + ' ' + (180 * parseInt($scope.skills[skill].Location.x) + 55) + ',' + (70 + 100 * parseInt($scope.skills[skill].Location.y))
             + '"/> <rect x="' + (((180 * parseInt($scope.skills[skill].Location.x) + 55) + (180 * parseInt($scope.skills[upstream].Location.x) + 55)) / 2 - 10) + '" y="' + (((70 + 100 * parseInt($scope.skills[upstream].Location.y))
             + (70 + 100 * parseInt($scope.skills[skill].Location.y))) / 2 - 10) + '" width="20" height="20" fill="#7373b9"></rect> <text stroke="navy" text-anchor="middle" x="' + (((180 * parseInt($scope.skills[skill].Location.x) + 55)
             + (180 * parseInt($scope.skills[upstream].Location.x) + 55)) / 2) + '" y="' + (((70 + 100 * parseInt($scope.skills[upstream].Location.y)) + (70 + 100 * parseInt($scope.skills[skill].Location.y))) / 2 + 5) + '"> '
             + $scope.skills[skill].Upstream[upstream] + '</text></svg>'
            element.append(template);
            midMarkers(document.getElementById(upstream + '-' + skill), 10);
        }
    }

    //taken from here: https://stackoverflow.com/questions/11808860/how-to-place-arrow-head-triangles-on-svg-lines
    function midMarkers(poly,spacing){
        var svg = poly.ownerSVGElement;
        for (var pts=poly.points,i=1;i<pts.numberOfItems;++i){
            var p0=pts.getItem(i-1), p1=pts.getItem(i);
            var dx=p1.x-p0.x, dy=p1.y-p0.y;
            var d = Math.sqrt(dx*dx+dy*dy);
            var numPoints = Math.floor( d/spacing );
            dx /= numPoints;
            dy /= numPoints;
            for (var j=numPoints-1;j>0;--j){
                var pt = svg.createSVGPoint();
                pt.x = p0.x+dx*j;
                pt.y = p0.y+dy*j;
                pts.insertItemBefore(pt,i);
            }
            if (numPoints>0) i += numPoints-1;
        }
    }

    //$attributes for skilldescriptions
    $scope.skillDescriptionBlock = {}; //list of divs for descriptions
    $scope.selectedSkill = ""; //selected skill to show description for
    $scope.formattedSkillData = {};
    $scope.skillLevelIndex = {};

    $scope.formatSkillData = function(skill) {
        $scope.formattedSkillData = {};
        for (var dataName in $scope.skills[skill].LevelData) {
            $scope.formattedSkillData[dataName] = [];
            $scope.skillLevelIndex[dataName] = [];
            var i = 0;
            var x = 0;
            for (var j = 0; j < $scope.skills[skill].LevelData[dataName].length; j++) {
                $scope.formattedSkillData[dataName][x] = {};
                $scope.formattedSkillData[dataName][x][$scope.skills[skill].LevelData[dataName][j]] = 0;

                if ($scope.formattedSkillData[dataName][i] == undefined) {
                    $scope.formattedSkillData[dataName][i] = {};
                    $scope.formattedSkillData[dataName][i][$scope.skills[skill].LevelData[dataName][j]] = 1;
                    
                    $scope.skillLevelIndex[dataName][x] = i;
                } else {
                    if ($scope.formattedSkillData[dataName][i][$scope.skills[skill].LevelData[dataName][j]] != undefined) {
                        $scope.formattedSkillData[dataName][i][$scope.skills[skill].LevelData[dataName][j]]++;
                        $scope.skillLevelIndex[dataName][x] = i;
                    } else {
                        i = x;
                        $scope.formattedSkillData[dataName][i] = {};
                        $scope.formattedSkillData[dataName][i][$scope.skills[skill].LevelData[dataName][j]] = 1;
                        
                        $scope.skillLevelIndex[dataName][x] = i;
                    }
                }
                x++;
            }
        }
    }
    $scope.getKey = function (obj) {
        return Object.keys(obj)[0];
    }
    $scope.getValue = function (obj) {
        return Object.values(obj)[0];
    }
}])
.directive("skillIcon", ['$compile', function($compile) {
    return {
        restrict: 'E',
        link: function ($scope, $element, $attrs) {
            angular.element(document).ready(function() {
                $scope.$apply(function() {
                    //Initialize the skill in skill allocation table
                    if ($scope.skillAllocation[$attrs.skill] == undefined) {
                        $scope.skillAllocation[$attrs.skill] = 0;
                    }
                    
                    //Read the skill data and create a div
                    skill = $scope.skills[$attrs.skill];
                    skillBlock = $compile('<skill id="' + $attrs.selectedClass + "-" + $attrs.skill + '" class="skill-icon" style="left:' + (60 + 180 * parseInt($scope.skills[$attrs.skill].Location.x)) + 'px; top:' + (170 + 100 * parseInt($scope.skills[$attrs.skill].Location.y))
                    + 'px; " ng-class="{disabled: shouldDisable(\'' + $attrs.skill + '\')}" skill=\'' + $attrs.skill + '\' selectedClass=\'' + $attrs.selectedClass + '\'>' + skill.Name
                    + ' <div class="skill-allocation"> {{skillAllocation[\'' + $attrs.skill + '\']}}/' + skill.MaxLevel + '</div></skill>')($scope);
                    //Create buttons
                    buttonDiv = angular.element("<div/>");
                    increaseButton = $compile('<button ng-click="increasePoint(\'' + $attrs.skill + '\', 1)" class="increase button" ng-class="{disabledBtn: skillAllocation[\'' + $attrs.skill + '\'] >= skills[\'' + $attrs.skill + '\'].MaxLevel}"> + </button>')($scope);
                    minusButton = $compile('<button ng-click="decreasePoint(\'' + $attrs.skill + '\', 1)" class="minus button" ng-class="{disabledBtn: skillAllocation[\'' + $attrs.skill + '\'] == 0}"> - </button>')($scope);
                    $element.append(skillBlock.append(buttonDiv.append(increaseButton).append(minusButton)));

                    //draw lines
                    $scope.drawLine($attrs.skill, $element);
                });
            });
        }
    };
}])
.directive("skill", ['$compile', function($compile) {
    return {
        restrict: 'E',
        link: function($scope, $element, $attrs) {
            angular.element(document).ready(function() {
                $scope.skillDescriptionBlock[$attrs.skill] = {
                    persist: false
                };
                $scope.skillDescriptionBlock[$attrs.skill].data = $compile('<skill-description skill="' + $attrs.skill + '" />')($scope);
                $element.bind("mouseover", function() {
                    $scope.$apply(function() {
                        $scope.formatSkillData($attrs.skill);
                        $scope.selectedSkill = $attrs.skill;
                        $element.append($scope.skillDescriptionBlock[$attrs.skill].data);
                    });
                });
                $element.bind("mouseout", function() {
                    $scope.skillDescriptionBlock[$attrs.skill].data.remove();
                });
            });
        }
    };
}]).directive("skillDescription", ['$compile', function($compile) {
    return {
        restrict: 'E',
        templateUrl: '.\\template\\skillPopup.html'
    };
}]);