import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SearchDropdown } from '../molecules/SearchDropdown';

interface SearchFormProps {
  onSelectBrand: () => void;
  selectedBrand?: string;
  onSelectModel: () => void;
  selectedModel?: string;
  onSelectVersion: () => void;
  selectedVersion?: string;
  onSearch: () => void;
  isSearchDisabled?: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  onSelectBrand,
  selectedBrand,
  onSelectModel,
  selectedModel,
  onSelectVersion,
  selectedVersion,
  onSearch,
  isSearchDisabled,
}) => {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSurface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        },
      ]}
    >
      <SearchDropdown
        label="Marca"
        placeholder={selectedBrand}
        onPress={onSelectBrand}
        style={{ marginBottom: spacing.md }}
      />
      <SearchDropdown
        label="Modelo"
        placeholder={selectedModel}
        onPress={onSelectModel}
        style={{ marginBottom: spacing.md }}
      />
      <SearchDropdown
        label="Versão"
        placeholder={selectedVersion}
        onPress={onSelectVersion}
        style={{ marginBottom: spacing.lg }}
      />

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onSearch}
        disabled={isSearchDisabled}
        style={[
          styles.button,
          {
            backgroundColor: isSearchDisabled ? colors.bgElevated : colors.accentBlue,
            borderRadius: radius.md,
            marginTop: spacing.xs,
          },
        ]}
      >
        <Text
          style={[
            typography.bodyMd,
            { color: isSearchDisabled ? colors.textMuted : 'white', fontWeight: '700' },
          ]}
        >
          Gerar ficha técnica
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});