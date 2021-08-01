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
      $('.toc-row').each(function(j, row){
        if(j === index){
          var $result = $(row).find('.current');
          var $target = $(row).find('.target');
          $result.text(separate(length));
          var targetLength = $.trim($target.text());
          if(targetLength.match(/\d+/)){
            targetLength = parseInt(targetLength, 10);
            // check target length
            $(row).find('.statistic').addClass(getTargetClass(length, targetLength));
            totalTarget += targetLength;
            $target.text(separate(targetLength) + '文字');
          }else{
            $target.text('---')
          }
        }
      });
    });
    $('.total-current').text(separate(total));
    $('.total-count').text(separate(totalTarget) + '文字');
  });

  // If max char set, limit.
  var charLimit = $('.container-main').attr('data-max-char');
  if(/^\d+$/.test(charLimit)){
    document.documentElement.style.setProperty('--max-line-width', ( parseInt( charLimit, 10 ) ) + "em" );
  }

  // If line limit exists, notify.
  var lineLimit = $('.container-main').attr('data-max-line');
  if(/^\d+$/.test(charLimit) && 0 < lineLimit) {
    // Set line limit.
    document.documentElement.style.setProperty('--max-line-length', parseInt( lineLimit, 10 ) );
    $('.story-content .container').addClass('line-limited');
    // 2x13pt
    var currentLines = 0;
    $('.story-content p').each( function( index, p ) {
      var lineHeight = parseFloat( getComputedStyle( p ).getPropertyValue( 'line-height' ) );
      currentLines += Math.round( p.offsetHeight / lineHeight );
    } );
    var lineStatusClass = currentLines <= lineLimit ? 'ok' : 'ng';
    $('.colophon-total').append('<strong class="' + lineStatusClass +  '">（' + currentLines + '/' + lineLimit + '行）</strong>')
  }

  $('#toggle').click( function(e) {
    e.preventDefault();
    $(this).toggleClass('toggled');
    window.location.hash = $(this).hasClass( 'toggled' ) ? 'toc-open' : '';
  } );

  if ( window.location.hash.match( /toc-open/ ) ) {
    $( '#toggle' ).addClass( 'toggled' );
  }

})(jQuery);
