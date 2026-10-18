import React, { forwardRef } from "react";
import { Platform, ScrollViewProps } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export interface AppKeyboardScrollViewProps extends ScrollViewProps {
  children?: React.ReactNode;
  extraScrollHeight?: number;
  extraHeight?: number;
  enableOnAndroid?: boolean;
  enableAutomaticScroll?: boolean;
  enableResetScrollToCoords?: boolean;
}

const AppKeyboardScrollView = forwardRef<any, AppKeyboardScrollViewProps>(
  (
    {
      children,
      style,
      contentContainerStyle,
      extraScrollHeight = 140,
      extraHeight = 150,
      keyboardShouldPersistTaps = "handled",
      keyboardDismissMode = "on-drag",
      enableOnAndroid = true,
      enableAutomaticScroll = true,
      enableResetScrollToCoords = false,
      ...props
    },
    ref
  ) => {
    return (
      <KeyboardAwareScrollView
        ref={ref}
        enableOnAndroid={enableOnAndroid}
        enableAutomaticScroll={enableAutomaticScroll}
        keyboardOpeningTime={Platform.OS === "ios" ? 250 : 0}
        extraScrollHeight={extraScrollHeight}
        extraHeight={extraHeight}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        showsVerticalScrollIndicator={false}
        enableResetScrollToCoords={enableResetScrollToCoords}
        style={style}
        contentContainerStyle={contentContainerStyle}
        {...props}
      >
        {children}
      </KeyboardAwareScrollView>
    );
  }
);

AppKeyboardScrollView.displayName = "AppKeyboardScrollView";

export default AppKeyboardScrollView;
