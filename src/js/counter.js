/**
 * Text length counter
 *
 * @package novel
 */

/*global jQuery: true*/

(function ($) {

  'use strict';

  var separate = function(num){
    return String(num).replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
  };

  var getTargetClass = function(current, target){
    var percentage = target / current;
    percentage -= 1;
    percentage = Math.abs(percentage);
    if(percentage < .1){
      return 'success';
    }else if(percentage < .3){
      return 'warning';
    }else{
      return 'danger';
    }
  };

  $(document).ready(function(){
    // Fix p
    $('.story-content p').each(function(index, p){
      var text = $(p).text();
      console.log(text);
      if(/^[「『]/.test(text)){
        $(p).addClass('no-indent');
      }
    });

    var total = 0;
    var totalTarget = 0;
    $('.story-content').each(function(index, section){

      // Count char length.
      var length = $(this).text().length;
      var rubyLength = 0;
      $(this).find('rt').each(function(i, rt){
        rubyLength += $(rt).text().length;
      });
      length = length - rubyLength;
      total += length;
      $('tbody .toc-row').each(function(j, row){
        if(j === index){
          var $result = $(row).find('td:nth-child(2)');
          var $target = $(row).find('td:nth-child(3)');
          $result.text(separate(length) + '文字');
          var targetLength = $.trim($target.text());
          if(targetLength.match(/\d+/)){
            targetLength = parseInt(targetLength, 10);
            // check target length
            $target.addClass(getTargetClass(length, targetLength));
            totalTarget += targetLength;
            $target.text(separate(targetLength) + '文字');
          }else{
            $target.text('---')
          }
        }
      });
    });
    $('.toc-list tfoot .toc-row td:nth-child(2)').text(separate(total) + '文字');
    var $totaltargetCell = $('.toc-list tfoot .toc-row td:nth-child(3)');
    if(totalTarget){
      $totaltargetCell.text(separate(totalTarget) + '文字');
    }
  });

})(jQuery);
